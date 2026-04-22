import { Request, Response } from 'express'
import { messageService } from './message.services'

export const messageController = {

    async send(req: Request, res: Response) {
        const message = await messageService.sendMessage({
            chatId: req.params.chatId as string,
            senderId: req.userId,
            content: req.body.content,
            type: req.body.type ?? 'TEXT',
            mediaUrl: req.body.mediaUrl,
            mediaMeta: req.body.mediaMeta,
            replyToId: req.body.replyToId,
        })
        res.status(201).json(message)
    },

    async getMessages(req: Request, res: Response) {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 30
        const result = await messageService.getMessages(
            req.params.chatId as string,
            req.userId,
            req.query.cursor as string | undefined,
            limit
        )
        res.json(result)
    },

    async deleteMessage(req: Request, res: Response) {
        const result = await messageService.deleteMessage(
            req.params.messageId as string,
            req.userId
        )
        res.json(result)
    },

    async reactToMessage(req: Request, res: Response) {
        const reactions = await messageService.reactToMessage(
            req.params.messageId as string,
            req.userId,
            req.body.emoji
        )
        res.json(reactions)
    },

    async removeReaction(req: Request, res: Response) {
        const result = await messageService.removeReaction(
            req.params.messageId as string,
            req.userId
        )
        res.json(result)
    },

    async getReceipts(req: Request, res: Response) {
        const receipts = await messageService.getReceipts(
            req.params.messageId as string,
            req.userId
        )
        res.json(receipts)
    },

    async markAsRead(req: Request, res: Response) {
        const result = await messageService.markChatAsRead(
            req.params.chatId as string,
            req.userId
        )
        res.json(result)
    },
};