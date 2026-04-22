import { z } from 'zod';
import { AuthenticatedWebsocket } from '../ws.registery';
import { publishToUser } from '../../pubsub/publisher';
import { redisCache } from '../../config/redis';
import { logger } from '../../config/logger';
import { chatRepository } from '../../modules/chats/chat.repository';

const typingTimers = new Map<string, NodeJS.Timeout>();

async function getChatMembersIds(chatId: string): Promise<string[]>{
    const cachKey = `chat:members:${chatId}`

    try {
        const cached = await redisCache.get(cachKey);
        if (cached) return JSON.parse(cached);
    } catch (error) {
    }

    const membersIds = await chatRepository.getMemberIds(chatId);
    await redisCache.setex(cachKey, 300, JSON.stringify(membersIds));

    return membersIds;
};

async function broadcatTyping(userId: string, chatId: string, isTyping: boolean) {
    try {
        const membersIds = await getChatMembersIds(chatId);
        const otherMembers = membersIds.filter((item) => item !== userId);

        otherMembers.forEach((memberId) => {
            publishToUser(memberId, {
                type: 'typing:indicator',
                payload: {
                    chatId,
                    userId,
                    isTyping
                }
            })
        })
    } catch (err) {
        logger.error(err, 'Failed to broadcast typing')
    }
};


export async function handleTyping(ws: AuthenticatedWebsocket, payload: unknown, isTyping: boolean) {
    const schema = z.object({ chatId: z.string().uuid() });
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return;

    const { chatId } = parsed.data;
    const key = `${ws.userId}:${chatId}`;
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    if (isTyping) {
        typingTimers.set(
            key,
            setTimeout(() => {
                broadcatTyping(ws.userId, chatId, false);
                typingTimers.delete(key);
            }, 5000)
        )
    }
    else {
        typingTimers.delete(key);
    }

    broadcatTyping(ws.userId, chatId, isTyping);
}