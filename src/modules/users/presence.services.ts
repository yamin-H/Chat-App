import { redisCache }    from '../../config/redis'
import { prisma }        from '../../config/database'
import { publishToUser } from '../../pubsub/publisher'
import { chatRepository } from '../chats/chat.repository'
import { logger }        from '../../config/logger'

const PRESENCE_TTL = 70 

export const presenceService = {

    async setOnline(userId: string) {
        await redisCache.setex(`presence:${userId}`, PRESENCE_TTL, 'online')
        await prisma.user.update({
            where: { id: userId },
            data: { isOnline: true },
        })
        await presenceService.broadcastPresence(userId, true)
    },

    async setOffline(userId: string) {
        await redisCache.del(`presence:${userId}`)
        await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
        })
        await presenceService.broadcastPresence(userId, false)
    },

    async isOnline(userId: string): Promise<boolean> {
        const result = await redisCache.get(`presence:${userId}`)
        return result === 'online'
    },

    async getPresenceBulk(userIds: string[]): Promise<Record<string, boolean>> {
        if (userIds.length === 0) return {}

        const pipeline = redisCache.pipeline()
        userIds.forEach((id) => pipeline.get(`presence:${id}`))
        const results = await pipeline.exec()

        return userIds.reduce((acc, id, i) => {
            acc[id] = results?.[i]?.[1] === 'online'
            return acc
        }, {} as Record<string, boolean>)
    },

    async broadcastPresence(userId: string, isOnline: boolean) {
        try {
            const chatMembers = await prisma.chatMember.findMany({
                where: {
                    chat: { members: { some: { userId } } },
                    userId: { not: userId },
                },
                select: { userId: true },
                distinct: ['userId'],
            })

            const event = {
                type: 'presence:update',
                payload: {
                    userId,
                    isOnline,
                    lastSeen: isOnline ? null : new Date().toISOString(),
                },
            }

            await Promise.all(
                chatMembers.map((m) => publishToUser(m.userId, event))
            )
        } catch (err) {
            logger.error(err, 'Failed to broadcast presence')
        }
    },
};