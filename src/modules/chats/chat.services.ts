import { chatRepository } from "./chat.repository";
import { userRepository } from "../users/user.repository";
import { AppError } from "../../middleware/errorHandler";

export const chatService = {
    async getOrCreateDirectChat(currentUserId: string, targetUserId: string) {
        if (currentUserId === targetUserId) {
            throw new AppError('Cannot create chat with yourself', 400);
        };

        const targetUser = await userRepository.findById(targetUserId);
        if (!targetUser) throw new AppError('User not found', 404);

        const existing = await chatRepository.findDirectChat(currentUserId, targetUserId);
        if (existing) return { chat: existing, created: false };

        const chat = await chatRepository.createDirectChat(currentUserId, targetUserId);
        return { chat, created: true };
    },

    async getUserChats(userId: string) {
        const chats = await chatRepository.getUserChat(userId);

        const chatsWithUnread = await Promise.all(
            chats.map(async (chat) => {
                const unreadCount = await chatRepository.getUnreadCount(chat.id, userId)
                return { ...chat, unreadCount }
            })
        );

        return chatsWithUnread;
    },

    async getChatById(chatId: string, userId: string) {

        const isMember = await chatRepository.isMember(chatId, userId);
        if (!isMember) throw new AppError('Chat not found', 404);
        const chat = await chatRepository.findById(chatId);
        if (!chat) throw new AppError('Chat not found', 404);

        return chat;
    },

    async markAsRead(chatId: string, userId: string) {

        const isMember = await chatRepository.isMember(chatId, userId);
        if (!isMember) throw new AppError('Chat not found', 404);
        await chatRepository.updateLastRead(chatId, userId);
        return { success: true };
    }
}