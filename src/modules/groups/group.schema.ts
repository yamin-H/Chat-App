import { z } from 'zod'

export const createGroupSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        memberIds: z.array(z.string().uuid()).min(1).max(99),
    }),
});

export const updateGroupSchema = z.object({
    params: z.object({
        groupId: z.string().uuid(),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
    }),
});

export const groupIdSchema = z.object({
    params: z.object({
        groupId: z.string().uuid(),
    }),
});

export const addMembersSchema = z.object({
    params: z.object({
        groupId: z.string().uuid(),
    }),
    body: z.object({
        userIds: z.array(z.string().uuid()).min(1).max(50),
    }),
});

export const removeMemberSchema = z.object({
    params: z.object({
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
    }),
});

export const updateRoleSchema = z.object({
    params: z.object({
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
    }),
    body: z.object({
        role: z.enum(['ADMIN', 'MEMBER']),
    }),
});

export const inviteCodeSchema = z.object({
    params: z.object({
        inviteCode: z.string().min(1),
    }),
});