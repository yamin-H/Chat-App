import { Request, Response } from 'express'
import { chatService } from './chat.services'

export const chatController = {

    async createDirectChat(req: Request, res: Response) {
        const result = await chatService.getOrCreateDirectChat(
            req.userId,
            req.body.targetUserId
        )
        res.status(result.created ? 201 : 200).json(result.chat)
    },

    async getMyChats(req: Request, res: Response) {
        const chats = await chatService.getUserChats(req.userId)
        res.json(chats)
    },

    async getChatById(req: Request, res: Response) {
        const firstArg = req.params.chatId as string;
        const chat = await chatService.getChatById(firstArg, req.userId)
        res.json(chat)
    },

    async markAsRead(req: Request, res: Response) {
        const firstArg = req.params.chatId as string;
        const result = await chatService.markAsRead(firstArg, req.userId)
        res.json(result)
    },
};