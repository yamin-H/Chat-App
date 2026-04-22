import { redisPublisher } from "../config/redis";
import { logger } from "../config/logger";

export async function publishToUser(userId: string, event: object) {
    try {
        
        await redisPublisher.publish(
            `user:${userId}`,
            JSON.stringify(event)
        );

    } catch (err) {
        logger.error(err, `Failed to publish to user:${userId}`)
    }
}

export async function publishToChat(chatId: string, event: object) {
    try {
        
        await redisPublisher.publish(
            `chat:${chatId}`,
            JSON.stringify(event)
        );

    } catch (err) {
        logger.error(err, `Failed to publish to chat:${chatId}`)
    }
}