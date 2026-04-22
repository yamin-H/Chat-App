import { messageRepository } from './message.repository'
import { chatRepository }    from '../chats/chat.repository'
import { AppError }          from '../../middleware/errorHandler'

export const messageService = {

    async sendMessage(data: {
        chatId: string
        senderId: string
        content?: string
        type: string
        mediaUrl?: string
        mediaMeta?: object
        replyToId?: string
    }) {
        const isMember = await chatRepository.isMember(data.chatId, data.senderId)
        if (!isMember) throw new AppError('You are not a member of this chat', 403)

        if (data.type === 'TEXT' && !data.content?.trim()) {
            throw new AppError('Message content is required', 400)
        }

        if (data.type !== 'TEXT' && !data.mediaUrl) {
            throw new AppError('Media URL is required', 400)
        }

        if (data.replyToId) {
            const replyTo = await messageRepository.findById(data.replyToId)
            if (!replyTo || replyTo.chatId !== data.chatId) {
                throw new AppError('Invalid reply target', 400)
            }
        }

        const message = await messageRepository.create(data)
        await chatRepository.findById(data.chatId) 
        const memberIds = await chatRepository.getMemberIds(data.chatId)
        const otherMembers = memberIds.filter((id) => id !== data.senderId)

        if (otherMembers.length > 0) {
            await messageRepository.createReceipts(message.id, otherMembers)
        }

        return message
    },

    async getMessages(chatId: string, userId: string, cursor?: string, limit = 30) {
        const isMember = await chatRepository.isMember(chatId, userId)
        if (!isMember) throw new AppError('Chat not found', 404)
        const messages = await messageRepository.findByChatId(chatId, cursor, limit)

        return {
            messages: messages.reverse(),
            nextCursor:
                messages.length === limit
                    ? messages[0].createdAt.toISOString()
                    : null,
        }
    },

    async deleteMessage(messageId: string, userId: string) {
        const message = await messageRepository.findById(messageId)
        if (!message) throw new AppError('Message not found', 404)
        if (message.senderId !== userId) throw new AppError('Not authorized', 403)

        const result = await messageRepository.softDelete(messageId, userId)
        if (result.count === 0) throw new AppError('Could not delete message', 400)

        return { success: true }
    },

    async reactToMessage(messageId: string, userId: string, emoji: string) {
        const message = await messageRepository.findById(messageId)
        if (!message) throw new AppError('Message not found', 404)

        const isMember = await chatRepository.isMember(message.chatId, userId)
        if (!isMember) throw new AppError('Not authorized', 403)

        await messageRepository.addReaction(messageId, userId, emoji)
        return messageRepository.getReactions(messageId)
    },

    async removeReaction(messageId: string, userId: string) {
        await messageRepository.removeReaction(messageId, userId)
        return { success: true }
    },

    async getReceipts(messageId: string, userId: string) {
        const message = await messageRepository.findById(messageId)
        if (!message) throw new AppError('Message not found', 404)

        const isMember = await chatRepository.isMember(message.chatId, userId)
        if (!isMember) throw new AppError('Not authorized', 403)

        return messageRepository.getReceipts(messageId)
    },

    async markChatAsRead(chatId: string, userId: string) {
        const isMember = await chatRepository.isMember(chatId, userId)
        if (!isMember) throw new AppError('Chat not found', 404)

        const count = await messageRepository.markReceiptsAsRead(chatId, userId)
        await chatRepository.updateLastRead(chatId, userId)

        return { markedAsRead: count }
    },
};