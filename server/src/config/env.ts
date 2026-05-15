import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('5000'),
    DATABASE_URL: z.string().optional(), // optional because tests or some environments might not provide it immediately
    JWT_SECRET: z.string().default('ems_secret'),
    JWT_REFRESH_SECRET: z.string().default('ems_refresh_secret'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

// Using passthrough to allow other environment variables, just validating what we care about
export const env = envSchema.passthrough().parse(process.env);
