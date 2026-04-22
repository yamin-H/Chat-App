import { AuthenticatedWebsocket } from './ws.registery'
import { handleSendMessage, handleMarkRead } from './handlers/message.handler'
import { handleTyping }        from './handlers/typing.handler'
import { handlePresenceQuery } from './handlers/presence.handler'
import { logger }              from '../config/logger'

export function routeEvent(ws: AuthenticatedWebsocket, event: any) {
    if (!event?.type) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Missing event type' } }));
        return;
    };

    logger.debug(`WS event [${ws.userId}]: ${event.type}`);

  switch (event.type) {
      case 'message:send': return handleSendMessage(ws, event.payload);
      case 'message:read': return handleMarkRead(ws, event.payload);
      case 'typing:start': return handleTyping(ws, event.payload, true);
      case 'typing:stop': return handleTyping(ws, event.payload, false);
      case 'presence:query': return handlePresenceQuery(ws, event.payload);
      default:
          ws.send(JSON.stringify({
              type: 'error',
              payload: { message: `Unknown event type: ${event.type}` },
          }));
    };
};