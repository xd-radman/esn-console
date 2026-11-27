/**
 * SummaryStrip.jsx — Customizable 3-Slot Swiss Bento KPI Strip
 * Reads per-project KPI configurations from `project.config.kpis` (falling back
 * cleanly to auto-generated starter KPIs until customized), computes live values
 * via `computeKpiValue()`, and exposes Edit (`Pencil`), Delete (`×`), and
 * dashed `+ Add KPI Box` controls (max 3 boxes) for users with `manage_graphs`.
 */

import { useMemo, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  buildDefaultProjectKpis,
  computeKpiValue,
} from '../lib/csvSchema.js';
import KpiConfigModal, { KPI_ICON_MAP } from './modals/KpiConfigModal.jsx';

export default function SummaryStrip({
  project,
  responses = [],
  canEdit = false,
  onSaveKpis,
}) {
  const { t } = useLang();
  const { showToast } = useToast();

  // Modal state (`{ open: boolean, kpi: object | null }`)
  const [modalState, setModalState] = useState({ open: false, kpi: null });

  const columns = useMemo(
    () => (Array.isArray(project?.config?.columns) ? project.config.columns : []),
    [project]
  );

  // Respect explicit saved `project.config.kpis` array; fall back when undefined
  const kpis = useMemo(() => {
    if (Array.isArray(project?.config?.kpis)) {
      return project.config.kpis.slice(0, 3);
    }
    return buildDefaultProjectKpis(columns, t('kpi.totalResponses'));
  }, [project, columns, t]);

  // Compute display values for all active KPI boxes in a single memoized pass
  const computedKpis = useMemo(
    () =>
      kpis.map((kpi) => ({
        ...kpi,
        result: computeKpiValue(kpi, responses, columns),
      })),
    [kpis, responses, columns]
  );

  // Persist added or edited KPI box to `projects.config.kpis` and fire a toast
  const handleSaveKpi = async (savedKpi) => {
    const exists = kpis.some((item) => item.id === savedKpi.id);
    const nextKpis = exists
      ? kpis.map((item) => (item.id === savedKpi.id ? savedKpi : item))
      : [...kpis, savedKpi].slice(0, 3);

    const ok = await onSaveKpis?.(nextKpis);
    if (ok) {
      showToast(
        exists ? t('kpi.updatedToast') : t('kpi.addedToast'),
        'success'
      );
    }
  };

  // Remove a KPI box and persist immediately
  const handleDeleteKpi = async (kpiId) => {
    const nextKpis = kpis.filter((item) => item.id !== kpiId);
    const ok = await onSaveKpis?.(nextKpis);
    if (ok) {
      showToast(t('kpi.deletedToast'), 'success');
    }
  };

  const canAddSlot = canEdit && kpis.length < 3;

  return (
    <>
      <section className="dashboard-kpi-strip" aria-label={t('kpi.stripLabel')}>
        {computedKpis.map((kpi) => {
          const TileIcon =
            kpi.icon && kpi.icon !== 'none' ? KPI_ICON_MAP[kpi.icon] ?? null : null;

          return (
            <article key={kpi.id} className="bento-card dashboard-kpi-tile">
              <div className="kpi-tile-header">
                <span className="font-mono-label dashboard-kpi-label">
                  {TileIcon && (
                    <TileIcon size={14} strokeWidth={1.5} aria-hidden="true" />
                  )}
                  <span>{kpi.title}</span>
                </span>

                {canEdit && (
                  <div className="kpi-tile-actions">
                    <button
                      type="button"
                      className="btn ghost kpi-tile-action-btn"
                      aria-label={t('kpi.editAria', { title: kpi.title })}
                      title={t('kpi.editAria', { title: kpi.title })}
                      onClick={() => setModalState({ open: true, kpi })}
                    >
                      <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="btn ghost kpi-tile-action-btn kpi-tile-delete-btn"
                      aria-label={t('kpi.deleteAria', { title: kpi.title })}
                      title={t('kpi.deleteAria', { title: kpi.title })}
                      onClick={() => handleDeleteKpi(kpi.id)}
                    >
                      <X size={14} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              <p className="font-editorial dashboard-kpi-value tabular-nums">
                <span>{kpi.result.displayValue}</span>
                {kpi.result.subtext && (
                  <span className="dashboard-kpi-unit">{kpi.result.subtext}</span>
                )}
              </p>
            </article>
          );
        })}

        {/* Dashed Swiss "+ Add KPI Box" slot when fewer than 3 KPI boxes are configured */}
        {canAddSlot && (
          <button
            type="button"
            className="kpi-add-slot"
            onClick={() => setModalState({ open: true, kpi: null })}
          >
            <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className="font-mono-label">{t('kpi.addBoxSlot')}</span>
          </button>
        )}
      </section>

      {canEdit && (
        <KpiConfigModal
          key={
            modalState.open
              ? `kpi-${modalState.kpi?.id ?? 'new'}`
              : 'kpi-closed'
          }
          isOpen={modalState.open}
          initialKpi={modalState.kpi}
          columns={columns}
          responses={responses}
          onClose={() => setModalState({ open: false, kpi: null })}
          onSave={handleSaveKpi}
        />
      )}
    </>
  );
}
