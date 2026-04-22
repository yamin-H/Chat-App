import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
  }
};

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
    };

    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
};