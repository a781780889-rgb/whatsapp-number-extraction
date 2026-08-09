import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Globe, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-paper-50 dark:bg-ink-900">
      <div className="pointer-events-none absolute -top-1/3 start-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-3xl" />

      <div className="absolute top-4 end-4 flex gap-1.5">
        <button
          onClick={toggleLang}
          className="focus-ring flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-ink-600 dark:text-paper-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
        >
          <Globe className="h-4 w-4" />
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
        <button
          onClick={toggleTheme}
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-ink-600 dark:text-paper-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm glass-panel-solid p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-ink-950 font-display font-bold text-xl mb-4">
            #
          </div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-paper-50">{t('login_title')}</h1>
          <p className="text-xs text-ink-500 dark:text-paper-400 mt-1">{t('login_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-600 dark:text-paper-300 mb-1.5">
              {t('login_email')}
            </label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus-ring w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 ps-10 pe-3.5 py-2.5 text-sm text-ink-900 dark:text-paper-50"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 dark:text-paper-300 mb-1.5">
              {t('login_password')}
            </label>
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-ring w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 ps-10 pe-3.5 py-2.5 text-sm text-ink-900 dark:text-paper-50"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-medium text-center">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" loading={loading} size="md">
            {loading ? t('login_loading') : t('login_submit')}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
