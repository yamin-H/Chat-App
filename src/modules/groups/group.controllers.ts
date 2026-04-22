import { Request, Response } from 'express'
import { groupService } from './group.services'

export const groupController = {

    async createGroup(req: Request, res: Response) {
        const result = await groupService.createGroup({
            name: req.body.name,
            description: req.body.description,
            memberIds: req.body.memberIds,
            createdById: req.userId,
        })
        res.status(201).json(result)
    },

    async getGroup(req: Request, res: Response) {
        const group = await groupService.getGroup(req.params.groupId as string, req.userId)
        res.json(group)
    },

    async updateGroup(req: Request, res: Response) {
        const group = await groupService.updateGroup(
            req.params.groupId as string,
            req.userId,
            req.body
        )
        res.json(group)
    },

    async addMembers(req: Request, res: Response) {
        const group = await groupService.addMembers(
            req.params.groupId as string,
            req.userId,
            req.body.userIds
        )
        res.json(group)
    },

    async removeMember(req: Request, res: Response) {
        const result = await groupService.removeMember(
            req.params.groupId as string,
            req.userId,
            req.params.userId as string
        )
        res.json(result)
    },

    async leaveGroup(req: Request, res: Response) {
        const result = await groupService.leaveGroup(
            req.params.groupId as string,
            req.userId
        )
        res.json(result)
    },

    async updateMemberRole(req: Request, res: Response) {
        const result = await groupService.updateMemberRole(
            req.params.groupId as string,
            req.userId,
            req.params.userId as string,
            req.body.role
        )
        res.json(result)
    },

    async joinByInviteCode(req: Request, res: Response) {
        const group = await groupService.joinByInviteCode(
            req.params.inviteCode as string,
            req.userId
        )
        res.json(group)
    },

    async resetInviteCode(req: Request, res: Response) {
        const result = await groupService.resetInviteCode(
            req.params.groupId as string,
            req.userId
        )
        res.json(result)
    },
};