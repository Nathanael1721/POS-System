import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load a local .env when present (native dev / migrations). In Docker the
// environment is provided directly, and dotenv never overrides real env vars.
loadDotenv();
loadDotenv({ path: '../../.env' });

/**
 * Validate and freeze process configuration at boot.
 * Fail fast with a clear message if anything required is missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 chars'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 chars'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  SENTRY_DSN: z.string().optional().default(''),
  DOPPLER_TOKEN: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console -- logger is not yet configured at this point
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
