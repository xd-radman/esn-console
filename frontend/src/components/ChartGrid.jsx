/**
 * ChartGrid.jsx — Customizable 12-Column Bento Graph Grid
 * Renders the Analytics section header (`+ Add Graph` and `Reset Default`),
 * maps each configured graph onto a responsive 12-column CSS Grid (`span-4`,
 * `span-6`, `span-8`, `span-12`), displays a Swiss Empty State card when all
 * tiles are removed, and hosts `AddGraphModal`.
 */

import { useState } from 'react';
import { BarChart3, Plus, RotateCcw } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import ChartTile from './ChartTile.jsx';
import AddGraphModal from './modals/AddGraphModal.jsx';

export default function ChartGrid({
  graphs = [],
  responses = [],
  sessions = [],
  onAddGraph,
  onRemoveGraph,
  onResetGraphs,
}) {
  const { t } = useLang();
  const [isAddGraphOpen, setIsAddGraphOpen] = useState(false);

  return (
    <section className="chart-grid-section" aria-label={t('charts.sectionTitle')}>
      {/* Section header with graph count, `+ Add Graph`, and `Reset Default` controls */}
      <header className="chart-grid-header">
        <div className="chart-grid-heading">
          <h2 className="font-editorial">{t('charts.sectionTitle')}</h2>
          <span className="font-mono-label dashboard-section-count tabular-nums">
            {graphs.length}
          </span>
        </div>

        <div className="chart-grid-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => setIsAddGraphOpen(true)}
          >
            <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('charts.addGraph')}</span>
          </button>

          <button
            type="button"
            className="btn ghost"
            onClick={onResetGraphs}
          >
            <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('charts.resetDefault')}</span>
          </button>
        </div>
      </header>

      {/* Swiss Empty State when all graph cards have been deleted */}
      {graphs.length === 0 ? (
        <article className="bento-card chart-empty-state">
          <span className="chart-empty-icon" aria-hidden="true">
            <BarChart3 size={24} strokeWidth={1.5} />
          </span>
          <h3 className="font-editorial">{t('charts.emptyTitle')}</h3>
          <p>{t('charts.emptySubtitle')}</p>
          <div className="chart-empty-actions">
            <button
              type="button"
              className="btn primary"
              onClick={onResetGraphs}
            >
              <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('charts.resetDefault')}</span>
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setIsAddGraphOpen(true)}
            >
              <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('charts.addGraph')}</span>
            </button>
          </div>
        </article>
      ) : (
        /* 12-column responsive Bento CSS Grid */
        <div className="chart-grid">
          {graphs.map((graph) => (
            <ChartTile
              key={graph.id}
              graph={graph}
              responses={responses}
              sessions={sessions}
              onRemove={onRemoveGraph}
            />
          ))}
        </div>
      )}

      {/* Add Graph tile configuration modal */}
      <AddGraphModal
        isOpen={isAddGraphOpen}
        onClose={() => setIsAddGraphOpen(false)}
        onAdd={onAddGraph}
      />
    </section>
  );
}
