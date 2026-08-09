import { useEffect, useState, useCallback } from 'react';
import { Search, Hash, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDashboardData } from '../../contexts/DashboardDataContext';
import { extractionApi } from '../../lib/extractionApi';
import { StatusBadge } from '../ui/StatusBadge';
import type { ExtractedNumber, Pagination } from '../../types';

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium' });
}

export function NumbersPanel() {
  const { t, lang, dir } = useLanguage();
  const { accounts } = useDashboardData();

  const [items, setItems] = useState<ExtractedNumber[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    extractionApi
      .fetchNumbers({
        page,
        pageSize: 25,
        search: search || undefined,
        accountId: accountId || undefined,
        status: status || undefined,
      })
      .then((res) => {
        setItems(res.items);
        setPagination(res.pagination);
      })
      .finally(() => setLoading(false));
  }, [page, search, accountId, status]);

  useEffect(() => {
    const handle = setTimeout(load, 300); // تأخير بسيط لتفادي طلب لكل ضغطة زر أثناء البحث
    return () => clearTimeout(handle);
  }, [load]);

  useEffect(() => setPage(1), [search, accountId, status]);

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-ink-900 dark:text-paper-50 mb-5">{t('numbers_title')}</h2>

      <div className="glass-panel p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            className="focus-ring w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 ps-9 pe-3 py-2 text-sm text-ink-900 dark:text-paper-50 placeholder:text-ink-400"
          />
        </div>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="focus-ring rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 px-3 py-2 text-sm text-ink-900 dark:text-paper-50"
        >
          <option value="">{t('filter_all_accounts')}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="focus-ring rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 px-3 py-2 text-sm text-ink-900 dark:text-paper-50"
        >
          <option value="">{t('filter_all_statuses')}</option>
          <option value="active">active</option>
          <option value="invalid">invalid</option>
          <option value="blocked">blocked</option>
        </select>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Hash className="h-8 w-8 text-ink-300 dark:text-paper-600 mb-2" />
            <p className="text-sm text-ink-500 dark:text-paper-400">{t('no_numbers_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-start">
                  {[
                    t('table_phone'),
                    t('table_country'),
                    t('table_group'),
                    t('table_account'),
                    t('table_occurrences'),
                    t('table_extractedAt'),
                    t('table_status'),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wide text-ink-400 dark:text-paper-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr
                    key={n.id}
                    className="border-b border-black/[0.04] dark:border-white/[0.05] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-ink-800 dark:text-paper-100">
                      {n.phoneNumber}
                    </td>
                    <td className="px-4 py-2.5 text-ink-600 dark:text-paper-300">
                      {(lang === 'ar' ? n.countryNameAr : n.countryNameEn) || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ink-600 dark:text-paper-300 max-w-[160px] truncate">
                      {n.groupNameSnapshot || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ink-600 dark:text-paper-300 max-w-[140px] truncate">
                      {n.accountNameSnapshot || '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-600 dark:text-paper-300">{n.occurrenceCount}</td>
                    <td className="px-4 py-2.5 text-ink-500 dark:text-paper-400">{formatDate(n.extractedAt, lang)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        label={n.status}
                        tone={n.status === 'active' ? 'success' : n.status === 'blocked' ? 'danger' : 'warning'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <span className="text-xs text-ink-500 dark:text-paper-400">
              {t('pagination_showing')} {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('pagination_of')}{' '}
              {pagination.total.toLocaleString()}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="focus-ring flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 dark:text-paper-300 disabled:opacity-40 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              >
                {dir === 'rtl' ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                {t('pagination_prev')}
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="focus-ring flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 dark:text-paper-300 disabled:opacity-40 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              >
                {t('pagination_next')}
                {dir === 'rtl' ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
