import { IncomingMessage } from 'http'
import { parse }           from 'url'
import { verifyToken }     from '../utils/jwt'
import { AppError } from '../middleware/errorHandler'
import { logger } from '../config/logger'

export async function verifyWsToken(req: IncomingMessage): Promise<string> {

    const { query } = parse(req.url || '', true);
    const token = query.token as string;
    if (!token) {
        logger.warn('WS auth: no token in query string')
        throw new AppError('No token provided', 401);
    }

   try {
       const payload = verifyToken(token);
       logger.debug(`WS auth: token type=${payload.type} userId=${payload.userId}`)
       if (payload.type !== 'ws') {
          logger.warn(`WS auth: wrong token type "${payload.type}", expected "ws"`)
          throw new AppError('Invalid token type', 401);
      };

       return payload.userId;
   } catch(err) {
       logger.warn(`WS auth failed: ${err}`)
       throw new AppError('Invalid or expired token', 401);
    };
};