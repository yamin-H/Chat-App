import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        phone: z.string().min(7).max(15),
        username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
        displayName: z.string().min(1).max(50),
        password: z.string().min(8).max(100)
    })
});

export const loginSchema = z.object({
    body: z.object({
        phone: z.string(),
        password: z.string(),
    }),
});

export const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string(),
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body']
export type LoginInput = z.infer<typeof loginSchema>['body']