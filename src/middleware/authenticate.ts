import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { AppError } from './errorHandler'

// Extend Express Request globally — no more casting needed anywhere
declare global {
  namespace Express {
    interface Request {
      userId: string
    }
  }
};

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401))
  }

  const token = header.split(' ')[1]

  try {
    const payload = verifyToken(token)
    if (payload.type !== 'access') throw new Error()
    req.userId = payload.userId
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401))
  }
};