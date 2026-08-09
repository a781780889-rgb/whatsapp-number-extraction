import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ExtractionAccount } from '../../types';

interface AddEditAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; description?: string }) => Promise<void>;
  account?: ExtractionAccount | null;
}

export function AddEditAccountModal({ open, onClose, onSubmit, account }: AddEditAccountModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(account?.name ?? '');
      setDescription(account?.description ?? '');
      setError(null);
    }
  }, [open, account]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError(t('field_name'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('toast_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={account ? t('action_edit') : t('add_account')} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-600 dark:text-paper-300 mb-1.5">
            {t('field_name')}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 px-3.5 py-2.5 text-sm text-ink-900 dark:text-paper-50 placeholder:text-ink-400"
            placeholder="مثال: حساب فريق المبيعات"
            maxLength={255}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-600 dark:text-paper-300 mb-1.5">
            {t('field_description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="focus-ring w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 px-3.5 py-2.5 text-sm text-ink-900 dark:text-paper-50 placeholder:text-ink-400 resize-none"
            maxLength={2000}
          />
        </div>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('action_cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t('action_save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
