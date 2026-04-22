import { z } from 'zod'

export const sendMessageSchema = z.object({
    body: z.object({
        content: z.string().min(1).max(4096).optional(),
        type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']).default('TEXT'),
        mediaUrl: z.string().url().optional(),
        mediaMeta: z.record(z.string(), z.any()).optional(),
        replyToId: z.string().uuid().optional(),
    }),
    params: z.object({
        chatId: z.string().uuid(),
    }),
});

export const getMessagesSchema = z.object({
    params: z.object({
        chatId: z.string().uuid(),
    }),
    query: z.object({
        cursor: z.string().optional(),
        limit: z.string().regex(/^\d+$/).optional(),
    }),
});

export const messageIdSchema = z.object({
    params: z.object({
        messageId: z.string().uuid(),
    }),
});

export const reactSchema = z.object({
    params: z.object({
        messageId: z.string().uuid(),
    }),
    body: z.object({
        emoji: z.string().min(1).max(10),
    }),
});