/**
 * SummaryStrip.jsx — 3-Tile Swiss Bento KPI Strip
 * Displays live summary metrics computed from the currently filtered response set:
 * 1) Total Responses
 * 2) Positive Outcome Rate (`outcome === 'yes'`, accented with ESN Green)
 * 3) Average Score (`/ 5`, formatted to 1 decimal place)
 * Uses Newsreader display numerals, JetBrains Mono micro-labels, and 1.5px Lucide icons.
 */

import { useMemo } from 'react';
import { Star, TrendingUp, Users } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function SummaryStrip({ responses = [] }) {
  const { t } = useLang();

  // Compute all 3 KPI values in a single memoized pass over `responses`
  const metrics = useMemo(() => {
    const total = responses.length;
    if (total === 0) {
      return {
        total: 0,
        positiveRate: '—',
        avgScore: '—',
        hasPositive: false,
      };
    }

    const yesCount = responses.filter((row) => row.outcome === 'yes').length;
    const positivePct = Math.round((yesCount / total) * 100);

    const validScores = responses
      .map((row) => row.score)
      .filter((val) => typeof val === 'number' && Number.isFinite(val));

    const avg =
      validScores.length > 0
        ? (validScores.reduce((acc, val) => acc + val, 0) / validScores.length).toFixed(1)
        : '—';

    return {
      total,
      positiveRate: `${positivePct}%`,
      avgScore: avg,
      hasPositive: true,
    };
  }, [responses]);

  return (
    <section className="dashboard-kpi-strip" aria-label={t('kpi.stripLabel')}>
      {/* Tile 1: Total Responses */}
      <article className="bento-card dashboard-kpi-tile">
        <span className="font-mono-label dashboard-kpi-label">
          <Users size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('kpi.totalResponses')}</span>
        </span>
        <p className="font-editorial dashboard-kpi-value tabular-nums">
          {metrics.total}
        </p>
      </article>

      {/* Tile 2: Positive Outcome Rate (%) — accented with ESN Green */}
      <article className="bento-card dashboard-kpi-tile kpi-positive">
        <span className="font-mono-label dashboard-kpi-label">
          <TrendingUp size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('kpi.positiveRate')}</span>
        </span>
        <p className="font-editorial dashboard-kpi-value tabular-nums">
          {metrics.positiveRate}
        </p>
      </article>

      {/* Tile 3: Average Score (/ 5) */}
      <article className="bento-card dashboard-kpi-tile">
        <span className="font-mono-label dashboard-kpi-label">
          <Star size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('kpi.avgScore')}</span>
        </span>
        <p className="font-editorial dashboard-kpi-value tabular-nums">
          <span>{metrics.avgScore}</span>
          {metrics.avgScore !== '—' && (
            <span className="dashboard-kpi-unit">/ 5</span>
          )}
        </p>
      </article>
    </section>
  );
}
