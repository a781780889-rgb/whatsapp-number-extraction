import { Cpu, Database, HardDrive, Timer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SystemResourceSnapshot } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';

function formatUptime(seconds: number, lang: string): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (lang === 'ar') return `${h}س ${m}د`;
  return `${h}h ${m}m`;
}

export function ResourceMonitor({ snapshot }: { snapshot: SystemResourceSnapshot | null }) {
  const { t, lang } = useLanguage();

  const cpuPercent = snapshot?.cpuPercent ?? 0;
  const memUsedMb = snapshot?.memory.rssMb ?? 0;
  const memTotalMb = snapshot?.memory.systemTotalMb ?? 1;
  const memPercent = Math.min(100, Math.round((memUsedMb / memTotalMb) * 100));

  return (
    <div className="glass-panel p-5">
      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-paper-50 mb-4">{t('section_resources')}</h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-paper-400">
              <Cpu className="h-3.5 w-3.5" /> {t('resource_cpu')}
            </span>
            <span className="text-xs font-semibold tabular-nums text-ink-800 dark:text-paper-100">{cpuPercent}%</span>
          </div>
          <ProgressBar percent={cpuPercent} tone={cpuPercent > 80 ? 'amber' : 'emerald'} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-paper-400">
              <HardDrive className="h-3.5 w-3.5" /> {t('resource_memory')}
            </span>
            <span className="text-xs font-semibold tabular-nums text-ink-800 dark:text-paper-100">
              {memUsedMb.toLocaleString()} / {memTotalMb.toLocaleString()} MB
            </span>
          </div>
          <ProgressBar percent={memPercent} tone={memPercent > 80 ? 'amber' : 'emerald'} />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
          <span className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-paper-400">
            <Database className="h-3.5 w-3.5" /> {t('resource_database')}
          </span>
          <span
            className={`text-xs font-semibold ${snapshot?.database.ok ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {snapshot ? `${snapshot.database.latencyMs}ms` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-paper-400">
            <Timer className="h-3.5 w-3.5" /> {t('resource_uptime')}
          </span>
          <span className="text-xs font-semibold text-ink-800 dark:text-paper-100">
            {snapshot ? formatUptime(snapshot.uptimeSeconds, lang) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
