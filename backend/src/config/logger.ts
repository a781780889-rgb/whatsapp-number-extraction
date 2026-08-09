import pino from 'pino';
import { env, isProduction } from './env.js';

/**
 * Central structured logger. In development it pretty-prints to the console;
 * in production it emits structured JSON (better for Railway log ingestion).
 * This is the console-side counterpart to the DB-backed systemLog service —
 * console/JSON logs are for operators tailing logs, systemLog rows are for
 * the in-app "سجل الأخطاء / سجل العمليات" panels the dashboard renders.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  base: { service: 'wa-number-extraction' },
});

export function childLogger(module: string) {
  return logger.child({ module });
}
