import { redisSubscriber } from "../config/redis";
import { registory } from "../websocket/ws.registery";
import { logger } from "../config/logger";

const subscribedChannels = new Set<string>();

redisSubscriber.on('message', (channel: string, message: string) => {
    try {
        
        const event = JSON.parse(message);
        if (channel.startsWith('user:')) {
            const userId = channel.replace('user:', '');
            const delivered = registory.sendToUsers(userId, event);
            if (!delivered) {
                logger.debug(`No socket found for user ${userId} on this instance`)
            }
        }

    } catch (err) {
        logger.error(err, `Failed to process message from channel ${channel}`)
    }
});

export async function subscribeToUserChannel(userId: string) {
    const channel = `user:${userId}`
    if (!subscribedChannels.has(channel)) {
        await redisSubscriber.subscribe(channel);
        subscribedChannels.add(channel);
        logger.debug(`Subscribed to ${channel}`);
    };
};

export async function unsubscribeFromUserChannel(userId: string) {
    const channel = `user:${userId}`
    if (subscribedChannels.has(channel)) {
        await redisSubscriber.unsubscribe(channel);
        subscribedChannels.delete(channel);
        logger.debug(`Unsubscribed from ${channel}`);
    };
}