import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'amber' | 'emerald' | 'rose' | 'neutral';
  suffix?: string;
  index?: number;
}

const toneClasses = {
  amber: 'text-amber-500 bg-amber-500/10',
  emerald: 'text-emerald-500 bg-emerald-500/10',
  rose: 'text-rose-500 bg-rose-500/10',
  neutral: 'text-ink-500 dark:text-paper-300 bg-black/[0.04] dark:bg-white/[0.06]',
};

export function StatCard({ label, value, icon: Icon, tone = 'neutral', suffix, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="glass-panel p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-ink-500 dark:text-paper-400">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="font-display text-2xl font-bold text-ink-900 dark:text-paper-50">
        <AnimatedNumber value={value} />
        {suffix && <span className="text-sm font-medium text-ink-400 dark:text-paper-400 ms-1">{suffix}</span>}
      </div>
    </motion.div>
  );
}
