import { z } from 'zod'

export const updateProfileSchema = z.object({
    body: z.object({
        displayName: z.string().min(1).max(50).optional(),
        bio: z.string().max(200).optional(),
        avatarUrl: z.string().url().optional(),
    }),
});

export const searchSchema = z.object({
    query: z.object({
        q: z.string().min(2).max(50),
    }),
});