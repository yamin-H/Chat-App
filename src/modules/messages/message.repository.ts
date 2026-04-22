import { tr } from "zod/v4/locales";
import { prisma } from "../../config/database";

export const messageRepository = {
    async create(data: {
        chatId: string
        senderId: string
        content?: string
        type: string
        mediaUrl?: string
        mediaMeta?: object
        replyToId?: string
    }) {
        return prisma.message.create({
            data: {
                chatId: data.chatId,
                senderId: data.senderId,
                content: data.content,
                type: data.type as any,
                mediaUrl: data.mediaUrl,
                mediaMeta: data.mediaMeta,
                replyToId: data.replyToId
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        type: true,
                        sender: {
                            select: {
                                id: true,
                                displayName: true
                            }
                        }
                    }
                },
                receipts: true,
                reactions: true
            }
        });
    },

    async findByChatId(chatId: string, cursor?: string, limit = 30) {
        return prisma.message.findMany({
            where: {
                chatId,
                isDeleted: false,
                ...(cursor && {
                    createdAt: { lt: new Date(cursor) },
                }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        type: true,
                        sender: {
                            select: {
                                id: true,
                                displayName: true,
                            },
                        },
                    },
                },
                receipts: true,
                reactions: true,
            },
        });
    },

    async findById(messageId: string) {
        return prisma.message.findUnique({
            where: { id: messageId },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                receipts: true,
                reactions: true,
            },
        });
    },

    async softDelete(messageId: string, userId: string) {
        return prisma.message.updateMany({
            where: {
                id: messageId,
                senderId: userId,
            },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                content: null,
                mediaUrl: null,
            },
        });
    },

    async addReaction(messageId: string, userId: string, emoji: string) {
        return prisma.messageReaction.upsert({
            where: {
                messageId_userId: { messageId, userId },
            },
            create: { messageId, userId, emoji },
            update: { emoji },
        })
    },

    async removeReaction(messageId: string, userId: string) {
        return prisma.messageReaction.deleteMany({
            where: { messageId, userId },
        })
    },

    async getReactions(messageId: string) {
        return prisma.messageReaction.findMany({
            where: { messageId },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                    },
                },
            },
        })
    },

    async createReceipts(messageId: string, userIds: string[]) {
        return prisma.messageReceipt.createMany({
            data: userIds.map((userId) => ({
                messageId,
                userId,
                status: 'DELIVERED',
                deliveredAt: new Date(),
            })),
            skipDuplicates: true,
        })
    },

    async markReceiptsAsRead(chatId: string, userId: string) {
        const unreadMessages = await prisma.messageReceipt.findMany({
            where: {
                userId,
                status: { not: 'READ' },
                message: { chatId },
            },
            select: { messageId: true },
        })

        if (unreadMessages.length === 0) return 0

        const messageIds = unreadMessages.map((r) => r.messageId)

        await prisma.messageReceipt.updateMany({
            where: {
                messageId: { in: messageIds },
                userId,
            },
            data: {
                status: 'READ',
                readAt: new Date(),
            },
        })

        return messageIds.length
    },

    async getReceipts(messageId: string) {
        return prisma.messageReceipt.findMany({
            where: { messageId },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        })
    }
};