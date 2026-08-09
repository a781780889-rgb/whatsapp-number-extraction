import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SystemLogEntry } from '../../types';

const levelConfig = {
  info: { icon: Info, color: 'text-sky-500' },
  warn: { icon: AlertTriangle, color: 'text-amber-500' },
  error: { icon: AlertCircle, color: 'text-rose-500' },
  debug: { icon: Bug, color: 'text-ink-400 dark:text-paper-500' },
};

function formatTime(iso: string, lang: string) {
  try {
    return new Date(iso).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export function LiveEventLog({ logs }: { logs: SystemLogEntry[] }) {
  const { t, lang } = useLanguage();

  return (
    <div className="glass-panel p-5 flex flex-col h-full">
      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-paper-50 mb-3">{t('section_liveLog')}</h3>

      <div className="flex-1 overflow-y-auto max-h-80 space-y-1 pe-1">
        {logs.length === 0 && (
          <p className="text-xs text-ink-400 dark:text-paper-500 py-6 text-center">{t('no_logs_yet')}</p>
        )}
        <AnimatePresence initial={false}>
          {logs.map((log, i) => {
            const config = levelConfig[log.level] ?? levelConfig.info;
            const Icon = config.icon;
            return (
              <motion.div
                key={`${log.createdAt}-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
                <span className="flex-1 text-xs text-ink-700 dark:text-paper-200 leading-snug">{log.message}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-ink-400 dark:text-paper-500 mt-0.5">
                  {formatTime(log.createdAt, lang)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
