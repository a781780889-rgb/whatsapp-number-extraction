import os from 'node:os';
import { emitToDashboard, RealtimeEvents } from './socket.service.js';
import { checkDatabaseHealth } from '../../db/index.js';
import { childLogger } from '../../config/logger.js';

const log = childLogger('system-monitor');

let previousCpuInfo = os.cpus();
let monitorInterval: NodeJS.Timeout | null = null;

/**
 * استهلاك المعالج/الذاكرة هنا هو استهلاك عملية Node.js التي تُدير جميع
 * حسابات هذا القسم (وليس عزلاً حقيقياً لكل حساب على حدة، لأن اتصالات
 * Baileys المتعددة تعمل داخل نفس العملية). هذا هو المقياس الصادق والمتاح
 * فعلياً؛ حالة/نشاط كل حساب على حدة تُعرض بشكل منفصل في بطاقته.
 */
function calculateCpuUsagePercent(): number {
  const currentCpuInfo = os.cpus();
  let totalDiff = 0;
  let idleDiff = 0;

  for (let i = 0; i < currentCpuInfo.length; i++) {
    const prev = previousCpuInfo[i]?.times;
    const curr = currentCpuInfo[i]?.times;
    if (!prev || !curr) continue;

    const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
    const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;

    totalDiff += currTotal - prevTotal;
    idleDiff += curr.idle - prev.idle;
  }

  previousCpuInfo = currentCpuInfo;
  if (totalDiff === 0) return 0;
  return Math.round((1 - idleDiff / totalDiff) * 100);
}

export async function getSystemSnapshot() {
  const mem = process.memoryUsage();
  const dbHealth = await checkDatabaseHealth();

  return {
    cpuPercent: calculateCpuUsagePercent(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      systemFreeMb: Math.round(os.freemem() / 1024 / 1024),
      systemTotalMb: Math.round(os.totalmem() / 1024 / 1024),
    },
    database: dbHealth,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export function startSystemMonitor(intervalMs = 5000) {
  if (monitorInterval) return;
  monitorInterval = setInterval(() => {
    getSystemSnapshot()
      .then((snapshot) => emitToDashboard(RealtimeEvents.SYSTEM_RESOURCES, snapshot))
      .catch((err) => log.error({ err }, 'Failed to capture system snapshot'));
  }, intervalMs);
  monitorInterval.unref?.();
  log.info(`System monitor started (interval=${intervalMs}ms)`);
}

export function stopSystemMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
