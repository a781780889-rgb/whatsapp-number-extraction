import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { childLogger } from './config/logger.js';
import { setIO } from './shared/services/socket.service.js';
import { registerSocketHandlers } from './sockets/index.js';
import { startSystemMonitor, stopSystemMonitor } from './shared/services/systemMonitor.service.js';
import { startExtractionWorker, stopExtractionWorker } from './modules/number-extraction/queue/extraction.worker.js';
import { closeExtractionQueue } from './modules/number-extraction/queue/extraction.queue.js';
import {
  resumeActiveConnections,
  shutdownAllConnections,
} from './modules/number-extraction/services/whatsappConnection.service.js';
import { closeDatabase } from './db/index.js';

const log = childLogger('server');

async function main() {
  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });
  setIO(io);
  registerSocketHandlers(io);

  startSystemMonitor();
  startExtractionWorker();

  httpServer.listen(env.PORT, () => {
    log.info(`🚀 Number-extraction backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // "استعادة جميع العمليات بعد إعادة تشغيل السيرفر"
  resumeActiveConnections().catch((err) => log.error({ err }, 'Failed to resume connections on boot'));

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`Received ${signal}, shutting down gracefully...`);

    stopSystemMonitor();
    await stopExtractionWorker();
    await closeExtractionQueue();
    await shutdownAllConnections();

    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await closeDatabase();

    log.info('Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // "حماية كاملة من الأخطاء" — خطأ غير متوقع في أي مكان لا يُسقط الخادم بالكامل،
  // بل يُسجَّل بوضوح ليصل للمشرف
  process.on('unhandledRejection', (reason) => {
    log.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    log.error({ err }, 'Uncaught exception');
  });
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
