import { z }                   from 'zod'
import { AuthenticatedWebsocket } from '../ws.registery'
import { presenceService } from '../../modules/users/presence.services'

export async function handlePresenceQuery(
  ws: AuthenticatedWebsocket,
  payload: unknown
) {
  const schema = z.object({
    userIds: z.array(z.string().uuid()).max(50),
  })

  const parsed = schema.safeParse(payload)
  if (!parsed.success) return

    const presence = await presenceService.getPresenceBulk(parsed.data.userIds);

    ws.send(JSON.stringify({
        type: 'presence:bulk',
        payload: presence,
    }));
};