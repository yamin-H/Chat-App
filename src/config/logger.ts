import pino from 'pino'
import pretty from 'pino-pretty'
import { env } from './env'

const stream = env.NODE_ENV === 'development'
  ? pretty({ colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' })
  : undefined

export const logger = stream ? pino({ level: env.LOG_LEVEL }, stream) : pino({ level: env.LOG_LEVEL })