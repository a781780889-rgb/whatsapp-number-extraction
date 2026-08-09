import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import type { OverviewStats } from '../../types';

export function CountryBreakdown({ stats }: { stats: OverviewStats | null }) {
  const { t, lang } = useLanguage();

  const data = (stats?.byCountry ?? [])
    .filter((c) => c.countryIso)
    .slice(0, 8)
    .map((c) => ({
      name: (lang === 'ar' ? c.countryNameAr : c.countryIso) || c.countryIso || '—',
      total: c.total,
    }));

  return (
    <div className="glass-panel p-5">
      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-paper-50 mb-3">{t('section_byCountry')}</h3>
      {data.length === 0 ? (
        <p className="text-xs text-ink-400 dark:text-paper-500 py-10 text-center">—</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              axisLine={false}
              tickLine={false}
              className="text-ink-500 dark:text-paper-400"
            />
            <Tooltip
              cursor={{ fill: 'rgba(239, 162, 60, 0.08)' }}
              contentStyle={{
                background: 'rgba(13, 19, 27, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontSize: 12,
                color: '#F5F3EF',
              }}
            />
            <Bar dataKey="total" radius={[0, 8, 8, 0]} maxBarSize={16}>
              {data.map((_, i) => (
                <Cell key={i} fill="#EFA23C" fillOpacity={1 - i * 0.08} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
