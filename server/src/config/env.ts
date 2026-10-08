import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// HF-2: the token-signing secrets have NO default. If either is missing, too short,
// or shared between access and refresh tokens, loading this module throws and the
// process cannot start (fail closed). This applies to every NODE_ENV, because
// NODE_ENV itself defaults to 'development' and must not be a way to run unsafely.
// Tests supply explicit test-only values in vitest.config.ts.
export const MIN_JWT_SECRET_LENGTH = 32;

const JWT_SECRET_HINT = `must be set to a random value of at least ${MIN_JWT_SECRET_LENGTH} characters`;

const envSchema = z
    .object({
        PORT: z.string().default('5000'),
        DATABASE_URL: z.string().optional(), // optional because tests or some environments might not provide it immediately
        JWT_SECRET: z.string().min(MIN_JWT_SECRET_LENGTH),
        JWT_REFRESH_SECRET: z.string().min(MIN_JWT_SECRET_LENGTH),
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    })
    // Using passthrough to allow other environment variables, just validating what we care about
    .passthrough()
    .refine((e) => e.JWT_SECRET !== e.JWT_REFRESH_SECRET, {
        path: ['JWT_REFRESH_SECRET'],
        message: 'must differ from JWT_SECRET',
    });

export function loadEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>) {
    const result = envSchema.safeParse(source);
    if (!result.success) {
        // Report which variables are wrong, never their values.
        const problems = result.error.issues.map((issue) => {
            const key = issue.path.join('.') || 'environment';
            return key.startsWith('JWT_') && issue.code !== 'custom'
                ? `${key} ${JWT_SECRET_HINT}`
                : `${key} ${issue.message}`;
        });
        throw new Error(`Invalid environment configuration:\n - ${problems.join('\n - ')}`);
    }
    return result.data;
}

export const env = loadEnv(process.env);
