/**
 * PredictionSidebar.jsx — Collapsible 60fps Organizer Prediction Drawer
 * Slides in smoothly from the left edge (`transform: translateX(-100%)` -> `0`)
 * when toggled from `Header.jsx`, locks background `<body>` scrolling while open
 * via `body.sidebar-open`, uses `inert` while collapsed so hidden inputs never
 * enter keyboard focus order, routes predictions through `mlApi.js`, and keeps
 * the verdict hidden until first click while persisting it across input edits.
 */

import { useEffect, useId, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Gauge,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { predictSessionOutcome } from '../lib/mlApi.js';

// Project-aware default session format presets
const DEFAULT_FORMAT_BY_PROJECT = {
  'speaking-club': 'interactive',
  'istanbul-cultural-trip': 'cultural',
  'buddy-system': 'mixer',
  'welcome-week': 'workshop',
};

export default function PredictionSidebar({
  isOpen,
  onClose,
  projectId,
  projectTitle = '',
}) {
  const { t } = useLang();

  // Controlled organizer scenario inputs
  const [format, setFormat] = useState(
    () => DEFAULT_FORMAT_BY_PROJECT[projectId] ?? 'interactive'
  );
  const [groupMix, setGroupMix] = useState('balanced');
  const [comfort, setComfort] = useState('high');
  const [groupSize, setGroupSize] = useState('28');

  // Prediction state: stays `null` until first button click; persists across edits
  const [prediction, setPrediction] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const titleId = useId();
  const formatId = useId();
  const mixId = useId();
  const comfortId = useId();
  const sizeId = useId();

  // Dismiss sidebar on `Escape` key while open
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background page scroll while the sidebar is open and always restore on close/unmount
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    document.body.classList.toggle('sidebar-open', isOpen);
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isOpen]);

  // Call `mlApi.js` and store the returned verdict (replacing any prior verdict)
  const handleCheckPrediction = async (event) => {
    event.preventDefault();
    setIsChecking(true);
    try {
      const result = await predictSessionOutcome({
        projectId,
        format,
        groupMix,
        comfort,
        groupSize: Number(groupSize),
      });
      setPrediction(result);
    } finally {
      setIsChecking(false);
    }
  };

  const verdictTone =
    prediction?.verdict === 'high_retention'
      ? 'high'
      : prediction?.verdict === 'moderate_retention'
        ? 'moderate'
        : 'risk';

  return (
    <>
      {/* Dimmed click-outside backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'is-open' : ''}`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-over drawer (`inert` removes collapsed controls from keyboard Tab order) */}
      <aside
        className={`prediction-sidebar ${isOpen ? 'is-open' : ''}`}
        aria-labelledby={titleId}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        {/* Drawer header */}
        <header className="sidebar-header hairline-bottom">
          <div className="sidebar-header-copy">
            <span className="mono-tag">
              <Cpu size={12} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('sidebar.kicker')}</span>
            </span>
            <h2 id={titleId} className="font-editorial sidebar-title">
              {t('sidebar.title')}
            </h2>
            {projectTitle && (
              <span className="font-mono-label sidebar-project-tag">
                {projectTitle}
              </span>
            )}
            <p className="sidebar-subtitle">{t('sidebar.subtitle')}</p>
          </div>

          <button
            type="button"
            className="btn ghost modal-close-btn"
            aria-label={t('sidebar.closeLabel')}
            onClick={onClose}
          >
            <X size={17} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable predictor form + verdict region */}
        <div className="sidebar-body">
          <form className="sidebar-form" onSubmit={handleCheckPrediction}>
            {/* Session Format */}
            <div className="form-field">
              <label htmlFor={formatId} className="form-label">
                {t('sidebar.sessionFormat')}
              </label>
              <div className="form-select-wrap">
                <select
                  id={formatId}
                  name="sessionFormat"
                  className="form-select"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                >
                  <option value="interactive">{t('sidebar.formats.interactive')}</option>
                  <option value="cultural">{t('sidebar.formats.cultural')}</option>
                  <option value="workshop">{t('sidebar.formats.workshop')}</option>
                  <option value="mixer">{t('sidebar.formats.mixer')}</option>
                </select>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="form-select-chevron"
                />
              </div>
            </div>

            {/* Participant Mix */}
            <div className="form-field">
              <label htmlFor={mixId} className="form-label">
                {t('sidebar.groupMix')}
              </label>
              <div className="form-select-wrap">
                <select
                  id={mixId}
                  name="groupMix"
                  className="form-select"
                  value={groupMix}
                  onChange={(event) => setGroupMix(event.target.value)}
                >
                  <option value="balanced">{t('sidebar.mixes.balanced')}</option>
                  <option value="erasmus_heavy">{t('sidebar.mixes.erasmus_heavy')}</option>
                  <option value="local_heavy">{t('sidebar.mixes.local_heavy')}</option>
                </select>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="form-select-chevron"
                />
              </div>
            </div>

            {/* Expected Comfort Level */}
            <div className="form-field">
              <label htmlFor={comfortId} className="form-label">
                {t('sidebar.comfortLevel')}
              </label>
              <div className="form-select-wrap">
                <select
                  id={comfortId}
                  name="comfortLevel"
                  className="form-select"
                  value={comfort}
                  onChange={(event) => setComfort(event.target.value)}
                >
                  <option value="high">{t('sidebar.comforts.high')}</option>
                  <option value="medium">{t('sidebar.comforts.medium')}</option>
                  <option value="low">{t('sidebar.comforts.low')}</option>
                </select>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="form-select-chevron"
                />
              </div>
            </div>

            {/* Expected Group Size */}
            <div className="form-field">
              <label htmlFor={sizeId} className="form-label">
                {t('sidebar.expectedSize')}
              </label>
              <input
                id={sizeId}
                name="expectedSize"
                type="number"
                min={5}
                max={250}
                className="form-input tabular-nums"
                value={groupSize}
                onChange={(event) => setGroupSize(event.target.value)}
              />
            </div>

            {/* Primary Check Prediction submit button */}
            <button
              type="submit"
              className="btn primary sidebar-submit-btn"
              disabled={isChecking}
            >
              {isChecking ? (
                <Loader2
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="spin-icon"
                />
              ) : (
                <Sparkles size={15} strokeWidth={1.5} aria-hidden="true" />
              )}
              <span>
                {isChecking ? t('sidebar.checking') : t('sidebar.checkBtn')}
              </span>
            </button>
          </form>

          {/* Verdict card: hidden until first Check Prediction click; persists across edits */}
          {prediction && (
            <section
              className={`verdict-card ${verdictTone}`}
              aria-live="polite"
            >
              <div className="verdict-top">
                <div className="verdict-label-group">
                  <span className="font-mono-label verdict-kicker">
                    {t('sidebar.verdictLabel')}
                  </span>
                  <h3 className="font-editorial verdict-title">
                    {verdictTone === 'high' ? (
                      <CheckCircle2 size={18} strokeWidth={1.5} aria-hidden="true" />
                    ) : verdictTone === 'moderate' ? (
                      <Gauge size={18} strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={18} strokeWidth={1.5} aria-hidden="true" />
                    )}
                    <span>{t(`sidebar.verdicts.${prediction.verdict}`)}</span>
                  </h3>
                </div>

                <div className="verdict-confidence">
                  <span className="font-mono-label verdict-kicker">
                    {t('sidebar.confidenceLabel')}
                  </span>
                  <span className="font-editorial verdict-prob tabular-nums">
                    {prediction.probability}%
                  </span>
                </div>
              </div>

              {prediction.topFactors?.length > 0 && (
                <div className="verdict-factors hairline-top">
                  <span className="font-mono-label verdict-kicker">
                    {t('sidebar.factorsLabel')}
                  </span>
                  <ul className="verdict-factors-list">
                    {prediction.topFactors.map((factorKey) => (
                      <li key={factorKey}>{t(`sidebar.factors.${factorKey}`)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer note documenting Phase 6 FastAPI swap */}
        <footer className="sidebar-footer hairline-top">
          <span className="font-mono-label">{t('sidebar.heuristicNote')}</span>
        </footer>
      </aside>
    </>
  );
}
