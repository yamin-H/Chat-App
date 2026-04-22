import { prisma } from "../../config/database";
import { redisCache } from "../../config/redis";

export const chatRepository = {
    async findDirectChat(userAId: string, userBId: string) {
        return prisma.chat.findFirst({
            where: {
                type: "DIRECT",
                AND: [
                    {
                        members: {
                            some: { userId: userAId },
                        }
                    },
                    {
                        members: {
                            some: {
                                userId: userBId
                            }
                        }
                    }
                ]
            },
            include: {
                members: {
                    select: {
                        userId: true,
                        role: true,
                        joinedAt: true,
                        lastReadAt: true
                    }
                }
            }
        })
    },

    async createDirectChat(userAId: string, userBId: string) {
        return prisma.chat.create({
            data: {
                type: "DIRECT",
                members: {
                    create: [
                        { userId: userAId },
                        { userId: userBId }
                    ]
                }
            },
            include: {
                members: {
                    select: {
                        userId: true,
                        role: true,
                        joinedAt: true,
                        lastReadAt: true
                    }
                }
            }
        });
    },

    async getUserChat(userId: string) {
        return prisma.chat.findMany({
            where: {
                members: {
                    some: { userId }
                }
            },
            orderBy: {
                updatedAt: "desc"
            },
            include: {
                members: {
                    select: {
                        userId: true,
                        lastReadAt: true,
                        mutedUntil: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isOnline: true,
                                lastSeen: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        type: true,
                        createdAt: true,
                        senderId: true,
                        isDeleted: true
                    }
                },
                group: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        avatarUrl: true
                    }
                }
            }
        })
    },

    async findById(chatId: string) {
        return prisma.chat.findUnique({
            where: {
                id: chatId
            },
            include: {
                members: {
                    select: {
                        userId: true,
                        role: true,
                        joinedAt: true,
                        lastReadAt: true,
                        mutedUntil: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isOnline: true,
                                lastSeen: true
                            }
                        }
                    }
                },
                group: true
            }
        })
    },

    async isMember(chatId: string, userId: string) {
        const member = await prisma.chatMember.findUnique({
            where: { chatId_userId: { chatId, userId } },
        });
        return !!member;
    },

    async getMemberIds(chatId: string): Promise<string[]> {
        const members = await prisma.chatMember.findMany({
            where: { chatId },
            select: { userId: true }
        });

        return members.map((item) => item.userId);
    },

    async updateLastRead(chatId: string, userId: string) {
        return prisma.chatMember.update({
            where: { chatId_userId: { chatId, userId } },
            data: { lastReadAt: new Date() },
        });
    },

    async getUnreadCount(chatId: string, userId: string) {
        const member = await prisma.chatMember.findUnique({
            where: { chatId_userId: { chatId, userId } },
            select: { lastReadAt: true },
        });

        return prisma.message.count({
            where: {
                chatId,
                isDeleted: false,
                senderId: { not: userId },
                ...(member?.lastReadAt && {
                    createdAt: { gt: member.lastReadAt },
                }),
            },
        });
    },

    async invalidateMembersCach(chatId: string) {
        await redisCache.del(`chat:members:${chatId}`);
    }
};