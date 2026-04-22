import { z }                 from 'zod'
import { AuthenticatedWebsocket } from '../ws.registery'
import { messageService } from '../../modules/messages/message.services'
import { publishToUser }     from '../../pubsub/publisher'
import { chatRepository }    from '../../modules/chats/chat.repository'
import { redisCache }        from '../../config/redis'
import { logger }            from '../../config/logger'

const sendSchema = z.object({
  chatId:          z.string().uuid(),
  content:         z.string().min(1).max(4096).optional(),
  type:            z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).default('TEXT'),
  mediaUrl:        z.string().url().optional(),
  replyToId:       z.string().uuid().optional(),
  clientMessageId: z.string().min(1),
})

export async function handleSendMessage(
  ws: AuthenticatedWebsocket,
  payload: unknown
) {
  const parsed = sendSchema.safeParse(payload)

  if (!parsed.success) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Invalid payload', issues: parsed.error.flatten().fieldErrors },
    }))
    return
  }

  const { chatId, content, type, mediaUrl, replyToId, clientMessageId } = parsed.data

  const dedupKey = `msg:dedup:${clientMessageId}`
  const exists   = await redisCache.set(dedupKey, '1', 'EX', 60, 'NX')
  if (!exists) {
    logger.debug(`Duplicate message ignored: ${clientMessageId}`)
    return
  }

    try {
        const message = await messageService.sendMessage({
            chatId,
            senderId: ws.userId,
            content,
            type,
            mediaUrl,
            replyToId,
        });

        await publishToUser(ws.userId, {
            type: 'message:ack',
            payload: { clientMessageId, message },
        });

        const memberIds = await chatRepository.getMemberIds(chatId);
        const otherMembers = memberIds.filter((id) => id !== ws.userId);

        await Promise.all(
            otherMembers.map((memberId) =>
                publishToUser(memberId, {
                    type: 'message:new',
                    payload: { message },
                })
            )
        );

    } catch (err: any) {
        ws.send(JSON.stringify({
            type: 'error',
            payload: { message: err.message ?? 'Failed to send message', clientMessageId },
        }));
    };
};

export async function handleMarkRead(
  ws: AuthenticatedWebsocket,
  payload: unknown
) {
  const schema = z.object({ chatId: z.string().uuid() })
  const parsed = schema.safeParse(payload)
  if (!parsed.success) return

    try {
      
      await messageService.markChatAsRead(parsed.data.chatId, ws.userId);
      const memberIds = await chatRepository.getMemberIds(parsed.data.chatId);
      const otherMembers = memberIds.filter((id) => id !== ws.userId);

      await Promise.all(
          otherMembers.map((memberId) =>
              publishToUser(memberId, {
                  type: 'receipt:update',
                  payload: {
                      chatId: parsed.data.chatId,
                      userId: ws.userId,
                      status: 'READ',
                      at: new Date().toISOString(),
                  },
              })
          )
      );
    } catch (err) {
        logger.error(err, 'Failed to mark as read');
    };
};