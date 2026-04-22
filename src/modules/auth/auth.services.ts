import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { signAccessToken, signRefreshToken, signWsToken, verifyToken } from '../../utils/jwt';
import type { RegisterInput, LoginInput } from './auth.schema';
import { ref } from 'node:process';

export const authService = {
    async register(input: RegisterInput) {
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: input.phone },
                    { username: input.username }
                ]
            }
        });

        if (existing) {
            const field = existing.phone === input.phone ? 'phone' : 'username'
            throw new AppError(`${field} already in use`, 409);
        }

        const hashedPassword = await bcrypt.hash(input.password, 12);
        const user = await prisma.user.create({
            data: {
                phone: input.phone,
                username: input.username,
                displayName: input.displayName,
                password: hashedPassword
            },
            select: {
                id: true,
                phone: true,
                username: true,
                displayName: true,
                createdAt: true
            }
        });

        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);

        await prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        return {
            user,
            accessToken,
            refreshToken
        };
    },

    async login(input: LoginInput, ipAddress?: string) {
        const user = await prisma.user.findUnique({
            where: { phone: input.phone }
        });

        if (!user) {
            throw new AppError("Invalid credentials", 401);
        }

        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) throw new AppError("Invalid credentials", 401);
        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);

        await prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                ipAddress,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        const { password: _, ...safeUser } = user;
        return {
            user: safeUser,
            accessToken,
            refreshToken
        };
    },

    async refresh(refrshToken: string) {
        let payload;

        try {
            payload = verifyToken(refrshToken);
        } catch (error) {
            throw new AppError('Invalid refresh token', 401)
        }

        if (payload.type !== 'refresh') {
            throw new AppError('Invalid token type', 401)
        }

        const session = await prisma.session.findUnique({
            where: { refreshToken : refrshToken },
        });

        if (!session || session.expiresAt < new Date()) {
            throw new AppError('Session expired, please login again', 401);
        };

        const accessToken = signAccessToken(payload.userId)
        return { accessToken };
    },

    async logout(refreshToken: string) {
        await prisma.session.deleteMany({ where: { refreshToken } });
    },

    async getWsToken(userId: string) {
        return {
            wsToken: signWsToken(userId)
        };
    }
}