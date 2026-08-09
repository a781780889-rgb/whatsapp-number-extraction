import { motion } from 'framer-motion';
import {
  Play,
  Square,
  Pencil,
  Trash2,
  RefreshCw,
  Eye,
  FolderOpen,
  Contact,
  Hash,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { StatusBadge, accountStatusTone } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { QrCodePanel } from './QrCodePanel';
import type { ExtractionAccount, JobProgressEvent } from '../../types';

interface AccountCardProps {
  account: ExtractionAccount;
  progress?: JobProgressEvent;
  canManage: boolean;
  index?: number;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExtractNow: () => void;
  onViewDetails: () => void;
}

function relativeTime(iso: string | null, lang: string): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return lang === 'ar' ? 'الآن' : 'just now';
  if (mins < 60) return lang === 'ar' ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
}

export function AccountCard({
  account,
  progress,
  canManage,
  index = 0,
  onStart,
  onStop,
  onEdit,
  onDelete,
  onExtractNow,
  onViewDetails,
}: AccountCardProps) {
  const { t, lang } = useLanguage();

  const isRunning = account.status === 'connecting' || account.status === 'awaiting_qr';
  const isConnected = account.status === 'connected';
  const isStoppable = isConnected || isRunning;
  const canExtract = isConnected && !progress;

  const jobPercent = progress && progress.totalGroups > 0 ? Math.round((progress.processedGroups / progress.totalGroups) * 100) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass-panel p-5 flex flex-col"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-ink-900 dark:text-paper-50 truncate">{account.name}</h3>
          {account.description && (
            <p className="text-xs text-ink-500 dark:text-paper-400 truncate mt-0.5">{account.description}</p>
          )}
        </div>
        <StatusBadge
          label={t(`account_status_${account.status}` as never)}
          tone={accountStatusTone(account.status)}
          pulse={isConnected || isRunning}
        />
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-xs text-ink-500 dark:text-paper-400">
        {isConnected ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5" />}
        {account.phoneNumber ? `+${account.phoneNumber}` : '—'}
      </div>

      {account.qrCode && account.status === 'awaiting_qr' && <QrCodePanel qrCode={account.qrCode} />}

      {progress && jobPercent !== null && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-ink-500 dark:text-paper-400">
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
              {progress.processedGroups}/{progress.totalGroups}
            </span>
            <span>{progress.speedPerMinute} {t('per_minute')}</span>
          </div>
          <ProgressBar percent={jobPercent} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] py-2">
          <FolderOpen className="h-3.5 w-3.5 mx-auto text-ink-400 dark:text-paper-500 mb-1" />
          <div className="text-sm font-bold tabular-nums text-ink-800 dark:text-paper-100">{account.groupsCount}</div>
          <div className="text-[10px] text-ink-400 dark:text-paper-500">{t('stat_groups')}</div>
        </div>
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] py-2">
          <Contact className="h-3.5 w-3.5 mx-auto text-ink-400 dark:text-paper-500 mb-1" />
          <div className="text-sm font-bold tabular-nums text-ink-800 dark:text-paper-100">{account.membersCount}</div>
          <div className="text-[10px] text-ink-400 dark:text-paper-500">{t('stat_members')}</div>
        </div>
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] py-2">
          <Hash className="h-3.5 w-3.5 mx-auto text-amber-500 mb-1" />
          <div className="text-sm font-bold tabular-nums text-ink-800 dark:text-paper-100">{account.extractedCount}</div>
          <div className="text-[10px] text-ink-400 dark:text-paper-500">{t('stat_extracted')}</div>
        </div>
      </div>

      <div className="flex gap-3 mt-3 text-[11px] text-ink-500 dark:text-paper-400">
        <span>
          {t('stat_new')}: <b className="text-emerald-500">{account.newCount}</b>
        </span>
        <span>
          {t('stat_duplicate')}: <b className="text-ink-600 dark:text-paper-300">{account.duplicateCount}</b>
        </span>
        <span>
          {t('stat_deleted')}: <b className="text-rose-500">{account.deletedCount}</b>
        </span>
      </div>

      <div className="flex items-center justify-between mt-2 text-[11px] text-ink-400 dark:text-paper-500">
        <span>{t('last_operation')}</span>
        <span>{relativeTime(account.lastOperationAt, lang)}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center gap-1.5">
        {canManage && (
          <>
            {isStoppable ? (
              <Button size="sm" variant="secondary" icon={<Square className="h-3.5 w-3.5" />} onClick={onStop}>
                {t('action_stop')}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={<Play className="h-3.5 w-3.5" />} onClick={onStart}>
                {t('action_start')}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={onExtractNow}
              disabled={!canExtract}
            >
              {t('action_extract_now')}
            </Button>
            <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit} />
            <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete} />
          </>
        )}
        <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={onViewDetails} className="ms-auto">
          {t('action_view_details')}
        </Button>
      </div>
    </motion.div>
  );
}
