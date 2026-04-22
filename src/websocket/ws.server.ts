import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage }            from 'http'
import { Server }                     from 'http'
import { verifyWsToken }              from './ws.auth'
import { registory, AuthenticatedWebsocket } from './ws.registery'
import { routeEvent }                 from './ws.router'
import { setupHeartBeat } from './ws.heartbeet'
import { subscribeToUserChannel, unsubscribeFromUserChannel } from '../pubsub/subscriber'
import { presenceService } from '../modules/users/presence.services'
import { logger }                     from '../config/logger'
import { v4 as uuidv4 }              from 'uuid'

export function createWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' })

  // Start heartbeat
  setupHeartBeat(wss)

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const socket = ws as AuthenticatedWebsocket

    // ── Authenticate ──────────────────────────────────────
    try {
      const userId   = await verifyWsToken(req)
      socket.userId  = userId
      socket.isAlive = true
      socket.socketId = uuidv4()
    } catch (err) {
      logger.warn('WS auth failed — closing connection')
      ws.close(4001, 'Unauthorized')
      return
    }

    const { userId } = socket
    logger.info(`WS connected: user=${userId} socketId=${socket.socketId}`)

    // ── Register + Subscribe ──────────────────────────────
    registory.add(userId, socket)
    await subscribeToUserChannel(userId)
    await presenceService.setOnline(userId)

    // Confirm connection to client
    socket.send(JSON.stringify({
      type:    'connected',
      payload: {
        userId,
        socketId:  socket.socketId,
        timestamp: new Date().toISOString(),
      },
    }))

    // ── Message handler ───────────────────────────────────
    socket.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString())
        routeEvent(socket, event)
      } catch {
        socket.send(JSON.stringify({
          type:    'error',
          payload: { message: 'Invalid JSON' },
        }))
      }
    })

    // ── Pong handler (heartbeat) ──────────────────────────
    socket.on('pong', () => {
      socket.isAlive = true
    })

    // ── Disconnect handler ────────────────────────────────
    socket.on('close', async () => {
      logger.info(`WS disconnected: user=${userId} socketId=${socket.socketId}`)
      registory.remove(userId, socket)

      if (!registory.hasConnections(userId)) {
        await unsubscribeFromUserChannel(userId)
        await presenceService.setOffline(userId)
      }
    })

    socket.on('error', (err) => {
      logger.error(err, `WS error for user=${userId}`)
    })
  })

  wss.on('error', (err) => {
    logger.error(err, 'WebSocket server error')
  })

  logger.info('WebSocket server ready on path /ws')
  return wss
};