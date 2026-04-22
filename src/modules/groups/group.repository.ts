import { prisma } from "../../config/database";
import { redisCache } from "../../config/redis";

export const groupRepository = {
    async create(data: {
        chatId: string;
        name: string;
        description?: string;
        createdById: string;
        memberIds: string[];
    }) {
        return prisma.group.create({
            data: {
                chatId: data.chatId,
                name: data.name,
                description: data.description,
                createdBy: data.createdById,
                members: {
                    create: data.memberIds.map((userId) => ({
                        userId,
                        role: userId === data.createdById ? 'OWNER' : 'MEMBER'
                    }))
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            }
        })
    },

    async findById(groupId: string) {
        return prisma.group.findUnique({
            where: { id: groupId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isOnline: true,
                                lastSeen: true,
                            },
                        },
                    },
                },
            },
        })
    },

    async findByChatId(chatId: string) {
        return prisma.group.findUnique({
            where: { chatId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isOnline: true,
                            },
                        },
                    },
                },
            },
        })
    },

    async findByInviteCode(inviteCode: string) {
        return prisma.group.findUnique({
            where: { inviteCode },
            include: {
                members: {
                    select: { userId: true },
                },
            },
        })
    },

    async update(groupId: string, data: {
        name?: string
        description?: string
        avatarUrl?: string
    }) {
        return prisma.group.update({
            where: { id: groupId },
            data,
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        })
    },

    async resetInviteCode(groupId: string) {
        return prisma.group.update({
            where: { id: groupId },
            data: { inviteCode: crypto.randomUUID() },
            select: { inviteCode: true },
        })
    },

    async getMember(groupId: string, userId: string) {
        return prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        })
    },

    async addMembers(groupId: string, userIds: string[]) {
        return prisma.groupMember.createMany({
            data: userIds.map((userId) => ({
                groupId,
                userId,
                role: 'MEMBER' as const,
            })),
            skipDuplicates: true,
        })
    },

    async removeMember(groupId: string, userId: string) {
        return prisma.groupMember.delete({
            where: { groupId_userId: { groupId, userId } },
        })
    },

    async updateMemberRole(groupId: string, userId: string, role: string) {
        return prisma.groupMember.update({
            where: { groupId_userId: { groupId, userId } },
            data: { role: role as any },
        })
    },

    async getMemberIds(groupId: string): Promise<string[]> {
        const members = await prisma.groupMember.findMany({
            where: { groupId },
            select: { userId: true },
        })
        return members.map((m) => m.userId)
    },

    async isMember(groupId: string, userId: string): Promise<boolean> {
        const member = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        })
        return !!member
    },

    async isAdminOrOwner(groupId: string, userId: string): Promise<boolean> {
        const member = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        })
        return member?.role === 'ADMIN' || member?.role === 'OWNER'
    },

    async isOwner(groupId: string, userId: string): Promise<boolean> {
        const member = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        })
        return member?.role === 'OWNER'
    },


    async invalidateMembersCache(chatId: string) {
        await redisCache.del(`chat:members:${chatId}`)
    }
};