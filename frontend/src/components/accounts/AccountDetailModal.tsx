import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { StatusBadge, accountStatusTone, jobStatusTone } from '../ui/StatusBadge';
import { useLanguage } from '../../contexts/LanguageContext';
import { extractionApi } from '../../lib/extractionApi';
import type { ExtractionAccount, ExtractionJob, SystemLogEntry } from '../../types';
import { Loader2, AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react';

const levelIcon = { info: Info, warn: AlertTriangle, error: AlertCircle, debug: Bug };
const levelColor = {
  info: 'text-sky-500',
  warn: 'text-amber-500',
  error: 'text-rose-500',
  debug: 'text-ink-400 dark:text-paper-500',
};

function formatDateTime(iso: string | null, lang: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

export function AccountDetailModal({
  account,
  onClose,
}: {
  account: ExtractionAccount | null;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<'jobs' | 'logs'>('jobs');
  const [jobs, setJobs] = useState<ExtractionJob[]>([]);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    setTab('jobs');
    Promise.all([extractionApi.fetchAccountJobs(account.id), extractionApi.fetchAccountLogs(account.id)])
      .then(([jobsData, logsData]) => {
        setJobs(jobsData);
        setLogs(logsData);
      })
      .finally(() => setLoading(false));
  }, [account]);

  return (
    <Modal open={!!account} onClose={onClose} title={t('account_detail_title')} maxWidth="max-w-2xl">
      {account && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-display font-bold text-ink-900 dark:text-paper-50">{account.name}</h4>
              {account.phoneNumber && (
                <p className="text-xs text-ink-500 dark:text-paper-400 mt-0.5">+{account.phoneNumber}</p>
              )}
            </div>
            <StatusBadge label={t(`account_status_${account.status}` as never)} tone={accountStatusTone(account.status)} />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: t('stat_groups'), value: account.groupsCount },
              { label: t('stat_members'), value: account.membersCount },
              { label: t('stat_extracted'), value: account.extractedCount },
              { label: t('stat_speed'), value: account.lastExtractionSpeed ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-2.5 text-center">
                <div className="text-base font-bold tabular-nums text-ink-800 dark:text-paper-100">{item.value}</div>
                <div className="text-[10px] text-ink-400 dark:text-paper-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <button
              onClick={() => setTab('jobs')}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === 'jobs'
                  ? 'border-amber-500 text-ink-900 dark:text-paper-50'
                  : 'border-transparent text-ink-400 dark:text-paper-500'
              }`}
            >
              {t('tab_jobs')}
            </button>
            <button
              onClick={() => setTab('logs')}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === 'logs'
                  ? 'border-amber-500 text-ink-900 dark:text-paper-50'
                  : 'border-transparent text-ink-400 dark:text-paper-500'
              }`}
            >
              {t('tab_logs')}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              </div>
            ) : tab === 'jobs' ? (
              jobs.length === 0 ? (
                <p className="text-xs text-ink-400 dark:text-paper-500 text-center py-8">{t('no_jobs_yet')}</p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-xl bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge label={t(`job_status_${job.status}` as never)} tone={jobStatusTone(job.status)} />
                          <span className="text-xs text-ink-500 dark:text-paper-400">
                            {job.newNumbers} {t('stat_new')} · {job.duplicateNumbers} {t('stat_duplicate')} ·{' '}
                            {job.deletedNumbers} {t('stat_deleted')}
                          </span>
                        </div>
                        {job.errorMessage && <p className="text-xs text-rose-500 mt-1">{job.errorMessage}</p>}
                      </div>
                      <span className="text-[11px] text-ink-400 dark:text-paper-500 shrink-0 ms-2">
                        {formatDateTime(job.startedAt ?? job.queuedAt, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : logs.length === 0 ? (
              <p className="text-xs text-ink-400 dark:text-paper-500 text-center py-8">{t('no_account_logs')}</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, i) => {
                  const Icon = levelIcon[log.level] ?? Info;
                  return (
                    <div key={i} className="flex items-start gap-2 px-2 py-1.5">
                      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${levelColor[log.level]}`} />
                      <span className="flex-1 text-xs text-ink-700 dark:text-paper-200">{log.message}</span>
                      <span className="text-[10px] text-ink-400 dark:text-paper-500 shrink-0">
                        {formatDateTime(log.createdAt, lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
