import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProgressBar } from '../ui/ProgressBar';
import type { ExtractionAccount, JobProgressEvent } from '../../types';

export function ActiveJobsList({
  progressByAccount,
  accounts,
}: {
  progressByAccount: Record<string, JobProgressEvent>;
  accounts: ExtractionAccount[];
}) {
  const { t } = useLanguage();
  const jobs = Object.values(progressByAccount);

  return (
    <div className="glass-panel p-5">
      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-paper-50 mb-3">
        {t('section_activeJobs')}
      </h3>

      {jobs.length === 0 ? (
        <p className="text-xs text-ink-400 dark:text-paper-500 py-6 text-center">{t('no_active_jobs')}</p>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {jobs.map((job) => {
              const account = accounts.find((a) => a.id === job.accountId);
              const percent = job.totalGroups > 0 ? Math.round((job.processedGroups / job.totalGroups) * 100) : 0;
              return (
                <motion.div
                  key={job.jobId}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-800 dark:text-paper-100">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                      {account?.name ?? job.accountId.slice(0, 8)}
                    </span>
                    <span className="text-xs tabular-nums text-ink-500 dark:text-paper-400">
                      {job.processedGroups}/{job.totalGroups} · {job.speedPerMinute} {t('per_minute')}
                    </span>
                  </div>
                  <ProgressBar percent={percent} />
                  <div className="flex gap-3 text-[11px] text-ink-500 dark:text-paper-400">
                    <span>
                      {t('stat_new')}: <b className="text-emerald-500">{job.newNumbers}</b>
                    </span>
                    <span>
                      {t('stat_duplicate')}: <b className="text-ink-600 dark:text-paper-300">{job.duplicateNumbers}</b>
                    </span>
                    <span>
                      {t('stat_deleted')}: <b className="text-rose-500">{job.deletedNumbers}</b>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
