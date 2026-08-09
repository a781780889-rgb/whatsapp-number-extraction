type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30',
  neutral: 'bg-black/[0.04] dark:bg-white/[0.06] text-ink-600 dark:text-paper-300 border-black/10 dark:border-white/10',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30',
};

export function StatusBadge({ label, tone, pulse = false }: { label: string; tone: Tone; pulse?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneClasses[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${pulse ? 'animate-pulse-soft' : ''}`} />
      {label}
    </span>
  );
}

export function accountStatusTone(status: string): Tone {
  switch (status) {
    case 'connected':
      return 'success';
    case 'awaiting_qr':
    case 'connecting':
      return 'warning';
    case 'error':
    case 'logged_out':
      return 'danger';
    case 'stopped':
    case 'disconnected':
    default:
      return 'neutral';
  }
}

export function jobStatusTone(status: string): Tone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
    case 'queued':
      return 'info';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}
