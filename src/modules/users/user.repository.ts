import { prisma } from "../../config/database";

export const userRepository = {
    async findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                phone: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
                updatedAt: true
            }
        })
    },

    async findByUsername(username: string) {
        return prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
            },
        });
    },

    async search(query: string, excludeUserId: string) {
        return prisma.user.findMany({
            where: {
                AND: [
                    {
                        id: { not: excludeUserId }
                    },
                    {
                        OR: [
                            {
                                username: {
                                    contains: query,
                                    mode: 'insensitive'
                                },
                                displayName: {
                                    contains: query,
                                    mode: 'insensitive'
                                },
                                phone: { contains: query }
                            }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true
            },
            take: 20
        })
    },

    async update(id: string, data: {
        displayName?: string
        bio?: string
        avatarUrl?: string
    }) {
        return prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                phone: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
                updatedAt: true,
            },
        });
    },

    async updatePresence(id: string, isOnline: boolean) {
        return prisma.user.update({
            where: { id },
            data: {
                isOnline,
                ...(!isOnline && { lastSeen: new Date() }),
            },
        });
    }
}