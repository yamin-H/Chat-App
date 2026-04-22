import { Request, Response, NextFunction } from 'express'
import { redisCache } from '../config/redis'
import { AppError } from './errorHandler'

export function rateLimiter(maxRequest: number, windowSecond: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const identifier = req.userId || req.ip || 'unknow';
        const key = `rl:${identifier}:${req.path}`

        try {
            const count = await redisCache.incr(key);
            if (count === 1) {
                await redisCache.expire(key, windowSecond);
            }

            res.setHeader('X-RateLimit-Limit',     maxRequest)
            res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequest - count));

            if (count > maxRequest) {
                const ttl = await redisCache.ttl(key);
                res.setHeader('X-RateLimit-Reset', ttl)
                return next(new AppError('Too many requests, slow down', 429))
            }

            next();
        } catch (error) {
            next();
        }
    }
}