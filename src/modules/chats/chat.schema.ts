import { z } from 'zod'

export const createDirectChatSchema = z.object({
    body: z.object({
        targetUserId: z.string().uuid(),
    }),
});

export const markReadSchema = z.object({
    params: z.object({
        chatId: z.string().uuid(),
    }),
});