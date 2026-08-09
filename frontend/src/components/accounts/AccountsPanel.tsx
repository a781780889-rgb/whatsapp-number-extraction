import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from '../../contexts/DashboardDataContext';
import { useToast } from '../../contexts/ToastContext';
import { extractionApi } from '../../lib/extractionApi';
import { extractApiErrorMessage } from '../../lib/api';
import { Button } from '../ui/Button';
import { AccountCard } from './AccountCard';
import { AddEditAccountModal } from './AddEditAccountModal';
import { AccountDetailModal } from './AccountDetailModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { ExtractionAccount } from '../../types';

export function AccountsPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { accounts, accountsLoading, refetchAccounts, progressByAccount } = useDashboardData();
  const toast = useToast();

  const canManage = user?.role === 'admin' || user?.role === 'operator';
  const canDelete = user?.role === 'admin';

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ExtractionAccount | null>(null);
  const [detailAccount, setDetailAccount] = useState<ExtractionAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<ExtractionAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleCreateOrUpdate = async (payload: { name: string; description?: string }) => {
    if (editingAccount) {
      await extractionApi.updateAccount(editingAccount.id, payload);
      toast.success(t('toast_account_updated'));
    } else {
      await extractionApi.createAccount(payload);
      toast.success(t('toast_account_created'));
    }
    await refetchAccounts();
  };

  const handleStart = async (account: ExtractionAccount) => {
    try {
      await extractionApi.startAccount(account.id);
      toast.info(t('toast_account_started'));
      await refetchAccounts();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('toast_error_generic')));
    }
  };

  const handleStop = async (account: ExtractionAccount) => {
    try {
      await extractionApi.stopAccount(account.id);
      toast.info(t('toast_account_stopped'));
      await refetchAccounts();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('toast_error_generic')));
    }
  };

  const handleExtractNow = async (account: ExtractionAccount) => {
    try {
      await extractionApi.triggerExtraction(account.id);
      toast.success(t('toast_extraction_triggered'));
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('toast_error_generic')));
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    setDeleteLoading(true);
    try {
      await extractionApi.deleteAccount(deletingAccount.id);
      toast.success(t('toast_account_deleted'));
      setDeletingAccount(null);
      await refetchAccounts();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('toast_error_generic')));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-bold text-ink-900 dark:text-paper-50">{t('accounts_title')}</h2>
        {canManage && (
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingAccount(null);
              setFormOpen(true);
            }}
          >
            {t('add_account')}
          </Button>
        )}
      </div>

      {accountsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-panel h-64 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-ink-300 dark:text-paper-600 mb-3" />
          <p className="text-sm text-ink-500 dark:text-paper-400 max-w-xs">{t('no_accounts_yet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <AccountCard
              key={account.id}
              account={account}
              progress={progressByAccount[account.id]}
              canManage={canManage}
              index={i}
              onStart={() => handleStart(account)}
              onStop={() => handleStop(account)}
              onEdit={() => {
                setEditingAccount(account);
                setFormOpen(true);
              }}
              onDelete={() => (canDelete ? setDeletingAccount(account) : toast.error(t('unauthorized_notice')))}
              onExtractNow={() => handleExtractNow(account)}
              onViewDetails={() => setDetailAccount(account)}
            />
          ))}
        </div>
      )}

      <AddEditAccountModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
        account={editingAccount}
      />

      <AccountDetailModal account={detailAccount} onClose={() => setDetailAccount(null)} />

      <ConfirmDialog
        open={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDelete}
        title={t('confirm_delete_title')}
        body={t('confirm_delete_body')}
        confirmLabel={t('action_confirm_delete')}
        cancelLabel={t('action_cancel')}
        loading={deleteLoading}
      />
    </div>
  );
}
