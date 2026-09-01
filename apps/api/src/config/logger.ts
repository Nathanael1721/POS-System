import pino from 'pino';
import { env, isProduction } from './env.js';

/**
 * Structured JSON logger. In non-production we pretty-print for readability;
 * in production we emit raw JSON for ingestion by the log pipeline.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  base: { service: 'simplepos-api', env: env.NODE_ENV },
  redact: {
    paths: ['req.headers.authorization', 'password', 'password_hash', '*.password', '*.password_hash'],
    censor: '[redacted]',
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname,service,env' },
      },
});

export type Logger = typeof logger;
