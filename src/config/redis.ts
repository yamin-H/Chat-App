import Redis from 'ioredis'
import { env } from './env'
import { logger } from './logger'

const makeRedis = (name: string) => {
    const client = new Redis(env.REDIS_URL, {
        retryStrategy: (times) => Math.min(times * 100, 3000),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
    client.on('connect', () => logger.info(`Redis [${name}] connected`));
    client.on('error', (err) => logger.error(err, `Redis [${name}] error`));
    return client;
}

export const redisPublisher = makeRedis('publisher')
export const redisSubscriber = makeRedis('subscriber')
export const redisCache = makeRedis('cache')