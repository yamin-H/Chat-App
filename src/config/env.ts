import * as dotenv from 'dotenv'
dotenv.config()
import { z } from 'zod'

const envSchema = z.object({
    NODE_ENV:                   z.enum(['development', 'production', 'test']).default('development'),
    PORT:                       z.string().default('3000'),
    DATABASE_URL:               z.string(),
    REDIS_URL:                  z.string(),
    JWT_SECRET:                 z.string().min(32),
    JWT_EXPIRES_IN:             z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN:   z.string().default('30d'),
    CLOUDINARY_CLOUD_NAME:      z.string(),
    CLOUDINARY_API_KEY:         z.string(),
    CLOUDINARY_API_SECRET:      z.string(),
    FRONTEND_URL:               z.string(),
    LOG_LEVEL:                  z.string().default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;