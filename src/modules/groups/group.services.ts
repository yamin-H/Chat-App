import { groupRepository } from './group.repository'
import { chatRepository }  from '../chats/chat.repository'
import { userRepository }  from '../users/user.repository'
import { publishToUser }   from '../../pubsub/publisher'
import { AppError }        from '../../middleware/errorHandler'
import { prisma }          from '../../config/database'

export const groupService = {

    async createGroup(data: {
        name: string
        description?: string
        memberIds: string[]
        createdById: string
    }) {
        if (data.memberIds.length < 1) {
            throw new AppError('Group must have at least 1 other member', 400)
        }

        if (data.memberIds.length > 99) {
            throw new AppError('Group cannot have more than 100 members', 400)
        }

        const uniqueIds = [...new Set([...data.memberIds, data.createdById])]
        const users = await prisma.user.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true },
        })

        if (users.length !== uniqueIds.length) {
            throw new AppError('One or more users not found', 404)
        }

        const chat = await prisma.chat.create({
            data: {
                type: 'GROUP',
                members: {
                    create: uniqueIds.map((userId) => ({ userId })),
                },
            },
        })

        const group = await groupRepository.create({
            chatId: chat.id,
            name: data.name,
            description: data.description,
            createdById: data.createdById,
            memberIds: uniqueIds,
        })

        await Promise.all(
            uniqueIds
                .filter((id) => id !== data.createdById)
                .map((memberId) =>
                    publishToUser(memberId, {
                        type: 'group:created',
                        payload: { chatId: chat.id, group },
                    })
                )
        )

        return { chatId: chat.id, group }
    },

    async getGroup(groupId: string, userId: string) {

        const isMember = await groupRepository.isMember(groupId, userId)
        if (!isMember) throw new AppError('Group not found', 404)
        const group = await groupRepository.findById(groupId)
        if (!group) throw new AppError('Group not found', 404)

        return group
    },

    async updateGroup(groupId: string, userId: string, data: {
        name?: string
        description?: string
        avatarUrl?: string
    }) {
        const isAdmin = await groupRepository.isAdminOrOwner(groupId, userId)
        if (!isAdmin) throw new AppError('Only admins can update group info', 403)
        const group = await groupRepository.update(groupId, data)

        const memberIds = await groupRepository.getMemberIds(groupId)
        await Promise.all(
            memberIds
                .filter((id) => id !== userId)
                .map((memberId) =>
                    publishToUser(memberId, {
                        type: 'group:updated',
                        payload: { groupId, group },
                    })
                )
        )

        return group
    },

    async addMembers(groupId: string, requesterId: string, userIds: string[]) {
        const isAdmin = await groupRepository.isAdminOrOwner(groupId, requesterId)
        if (!isAdmin) throw new AppError('Only admins can add members', 403)

        const group = await groupRepository.findById(groupId)
        if (!group) throw new AppError('Group not found', 404)

        const currentCount = group.members.length
        if (currentCount + userIds.length > 100) {
            throw new AppError('Group member limit is 100', 400)
        }

        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true },
        })
        if (users.length !== userIds.length) {
            throw new AppError('One or more users not found', 404)
        }

        await groupRepository.addMembers(groupId, userIds)
        await prisma.chatMember.createMany({
            data: userIds.map((userId) => ({
                chatId: group.chatId,
                userId,
            })),
            skipDuplicates: true,
        })

        await groupRepository.invalidateMembersCache(group.chatId)
        const existingMemberIds = await groupRepository.getMemberIds(groupId)

        await Promise.all(
            userIds.map((userId) =>
                publishToUser(userId, {
                    type: 'member:added',
                    payload: { chatId: group.chatId, groupId },
                })
            )
        )

        await Promise.all(
            existingMemberIds
                .filter((id) => !userIds.includes(id) && id !== requesterId)
                .map((memberId) =>
                    publishToUser(memberId, {
                        type: 'group:members:added',
                        payload: { groupId, addedUserIds: userIds },
                    })
                )
        )

        return groupRepository.findById(groupId)
    },

    async removeMember(groupId: string, requesterId: string, targetUserId: string) {

        const isAdmin = await groupRepository.isAdminOrOwner(groupId, requesterId)
        if (!isAdmin) throw new AppError('Only admins can remove members', 403)
        const isTargetOwner = await groupRepository.isOwner(groupId, targetUserId)
        if (isTargetOwner) throw new AppError('Cannot remove the group owner', 400)
        const group = await groupRepository.findById(groupId)
        if (!group) throw new AppError('Group not found', 404)

        await groupRepository.removeMember(groupId, targetUserId)
        await prisma.chatMember.delete({
            where: {
                chatId_userId: {
                    chatId: group.chatId,
                    userId: targetUserId,
                },
            },
        })

        await groupRepository.invalidateMembersCache(group.chatId)
        await publishToUser(targetUserId, {
            type: 'member:removed',
            payload: { chatId: group.chatId, groupId },
        })

        const remainingMemberIds = await groupRepository.getMemberIds(groupId)
        await Promise.all(
            remainingMemberIds
                .filter((id) => id !== requesterId)
                .map((memberId) =>
                    publishToUser(memberId, {
                        type: 'group:members:removed',
                        payload: { groupId, removedUserId: targetUserId },
                    })
                )
        )

        return { success: true }
    },

    async leaveGroup(groupId: string, userId: string) {
        const isMember = await groupRepository.isMember(groupId, userId)
        if (!isMember) throw new AppError('You are not a member of this group', 400)
        const isOwner = await groupRepository.isOwner(groupId, userId)
        if (isOwner) {
            throw new AppError(
                'Owner cannot leave. Transfer ownership or delete the group first.',
                400
            )
        }

        const group = await groupRepository.findById(groupId)
        if (!group) throw new AppError('Group not found', 404)
        await groupRepository.removeMember(groupId, userId)

        await prisma.chatMember.delete({
            where: {
                chatId_userId: {
                    chatId: group.chatId,
                    userId,
                },
            },
        })

        await groupRepository.invalidateMembersCache(group.chatId)
        const remainingIds = await groupRepository.getMemberIds(groupId)
        await Promise.all(
            remainingIds.map((memberId) =>
                publishToUser(memberId, {
                    type: 'group:member:left',
                    payload: { groupId, userId },
                })
            )
        )

        return { success: true }
    },

    async updateMemberRole(
        groupId: string,
        requesterId: string,
        targetUserId: string,
        role: string
    ) {
        const isOwner = await groupRepository.isOwner(groupId, requesterId)
        if (!isOwner) throw new AppError('Only the owner can change roles', 403)

        if (!['ADMIN', 'MEMBER'].includes(role)) {
            throw new AppError('Role must be ADMIN or MEMBER', 400)
        }

        await groupRepository.updateMemberRole(groupId, targetUserId, role)
        await publishToUser(targetUserId, {
            type: 'group:role:updated',
            payload: { groupId, role },
        })

        return { success: true }
    },

    async joinByInviteCode(inviteCode: string, userId: string) {
        const group = await groupRepository.findByInviteCode(inviteCode)
        if (!group) throw new AppError('Invalid invite link', 404)

        const alreadyMember = group.members.some((m) => m.userId === userId)
        if (alreadyMember) throw new AppError('You are already in this group', 400)

        if (group.members.length >= 100) {
            throw new AppError('Group is full', 400)
        }

        await groupRepository.addMembers(group.id, [userId])

        await prisma.chatMember.create({
            data: { chatId: group.chatId, userId },
        })
        await groupRepository.invalidateMembersCache(group.chatId)
        const memberIds = await groupRepository.getMemberIds(group.id)
        await Promise.all(
            memberIds
                .filter((id) => id !== userId)
                .map((memberId) =>
                    publishToUser(memberId, {
                        type: 'member:added',
                        payload: { chatId: group.chatId, groupId: group.id, userId },
                    })
                )
        )

        return groupRepository.findById(group.id)
    },

    async resetInviteCode(groupId: string, userId: string) {

        const isAdmin = await groupRepository.isAdminOrOwner(groupId, userId)
        if (!isAdmin) throw new AppError('Only admins can reset the invite link', 403)
        return groupRepository.resetInviteCode(groupId)
    },
};