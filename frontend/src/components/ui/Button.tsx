import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-amber-500 text-ink-950 hover:bg-amber-400 shadow-glow disabled:hover:bg-amber-500 font-semibold',
  secondary:
    'bg-black/[0.03] dark:bg-white/[0.06] text-ink-800 dark:text-paper-100 border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]',
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20',
  ghost: 'text-ink-600 dark:text-paper-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-xl',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, disabled, className = '', children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`focus-ring inline-flex items-center justify-center transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...rest}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
