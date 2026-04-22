import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload{
    userId: string;
    type: 'access' | 'refresh' | 'ws';
}

export function signAccessToken(userId: string): string {
    return jwt.sign(
        { userId, type: 'access' } as JwtPayload,
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
    );
}

export function signRefreshToken(userId: string): string {
    return jwt.sign(
        { userId, type: 'refresh' } as JwtPayload,
        env.JWT_SECRET,
        { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }
    );
}

export function signWsToken(userId: string): string {
    return jwt.sign(
        { userId, type: 'ws' } as JwtPayload,
        env.JWT_SECRET,
        { expiresIn: process.env.NODE_ENV === 'development' ? '1d' : '2m' }
    );
};

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}