import type { Server, Socket } from 'socket.io';
import { verifyAccessToken, type AccessTokenPayload } from '../shared/middleware/auth.middleware.js';
import { childLogger } from '../config/logger.js';

const log = childLogger('socket');

interface SocketData {
  user: AccessTokenPayload;
}

/**
 * كل عميل لوحة تحكم متصل يجب أن يحمل JWT صالحاً (نفس التوكن المستخدم لـ
 * REST API) — يُتحقق منه أثناء المصافحة قبل قبول الاتصال، ثم يُنضم العميل
 * لغرفة "dashboard" ليستقبل كل البث اللحظي (حالة الحسابات، تقدّم السحب،
 * السجلات، موارد النظام).
 */
export function registerSocketHandlers(io: Server) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      (socket.data as SocketData).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket.data as SocketData).user;
    socket.join('dashboard');
    log.info({ userId: user?.sub, socketId: socket.id }, 'Dashboard client connected');

    socket.on('disconnect', (reason) => {
      log.debug({ userId: user?.sub, socketId: socket.id, reason }, 'Dashboard client disconnected');
    });
  });
}
