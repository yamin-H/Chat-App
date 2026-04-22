import * as dotenv from 'dotenv'
dotenv.config()

import { env } from './config/env'
import { logger } from './config/logger'
import { prisma } from './config/database'
import { redisCache } from './config/redis'
import { errorHandler } from './middleware/errorHandler'
import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from "./modules/auth/auth.routs";
import userRoutes from "./modules/users/user.routs";
import chatRoutes from "./modules/chats/chat.routs";
import messageRoutes from "./modules/messages/message.routs";
import { createWebSocketServer } from './websocket/ws.server'
import groupRoutes from './modules/groups/group.routs';
import mediaRoutes from './modules/media/media.routs';

const app    = express()
const server = http.createServer(app);
const wss = createWebSocketServer(server);

app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', async (_req, res) => {
    let dbOk = false
    let redisOk = false

    try { await prisma.$queryRaw`SELECT 1`; dbOk = true } catch { }
    try { await redisCache.ping(); redisOk = true } catch { }

    const allOk = dbOk && redisOk

    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
            database: dbOk ? 'ok' : 'unreachable',
            redis: redisOk ? 'ok' : 'unreachable',
        },
    })
});

app.use(errorHandler)

async function shutdown(signal: string) {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
        await prisma.$disconnect()
        process.exit(0)
    });
};
process.on('SIGTERM', () => shutDown('SIGTERM'))
process.on('SIGINT', () => shutDown('SIGINT'))

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/media', mediaRoutes)

async function shutDown(signal: string) {
    logger.info(`${signal} received — shutting down`)

    wss.clients.forEach((ws) => {
        ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Server restarting, please reconnect in 3 seconds' }
        }));
        ws.close(1001, 'Server shutting down')
    });

    server.close(async () => {
        await prisma.$disconnect()
        process.exit(0)
    });
}

server.listen(Number(env.PORT), () => {
    logger.info(`🚀 Server ready → http://localhost:${env.PORT}`)
    logger.info(`🔍 Health check → http://localhost:${env.PORT}/health`)
});
