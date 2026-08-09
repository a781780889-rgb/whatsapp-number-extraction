import { motion } from 'framer-motion';

export function ProgressBar({ percent, tone = 'amber' }: { percent: number; tone?: 'amber' | 'emerald' }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor = tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
      <motion.div
        className={`h-full rounded-full ${barColor}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  );
}
