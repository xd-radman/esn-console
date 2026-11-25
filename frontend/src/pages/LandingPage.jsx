/**
 * LandingPage.jsx — Root Route (`/`) Placeholder View
 * Renders the Step 1.2 Swiss × Bento landing card, displays the active theme
 * and bilingual copy from `LangContext`, and links to `/project/speaking-club`
 * so client-side routing can be verified end-to-end before Phase 2.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CircleCheck } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function LandingPage() {
  // Translation lookup and active theme state from global contexts
  const { t } = useLang();
  const { isDark } = useTheme();

  // Keep the browser tab title localized when visiting `/` or switching EN/TR
  useEffect(() => {
    document.title = t('landing.pageTitle');
  }, [t]);

  return (
    <main className="page-stage">
      <article className="bento-card placeholder-card">
        {/* Card header: Phase kicker chip and routing readiness badge */}
        <header>
          <span className="mono-tag">{t('landing.kicker')}</span>
          <span className="font-mono-label status-badge active">
            <CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('common.ready')}</span>
          </span>
        </header>

        {/* Editorial page heading and overview copy */}
        <div className="placeholder-body">
          <h1 className="font-editorial">{t('landing.title')}</h1>
          <p className="placeholder-subtitle">{t('landing.subtitle')}</p>
        </div>

        {/* Sample navigation card testing dynamic `/project/:projectId` routing */}
        <Link to="/project/speaking-club" className="sample-route-card">
          <div className="sample-route-meta">
            <span className="font-mono-label sample-route-kicker">
              {t('landing.sampleTag')}
            </span>
            <h2 className="font-editorial">{t('landing.sampleTitle')}</h2>
            <p>{t('landing.sampleDesc')}</p>
          </div>
          <span className="sample-route-action">
            <span>{t('landing.openProject')}</span>
            <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </span>
        </Link>

        {/* Footer metadata showing the currently active surface theme */}
        <footer className="hairline-top">
          <span>
            {t('common.activeTheme')}:{' '}
            <strong>{isDark ? t('theme.labelDark') : t('theme.labelLight')}</strong>
          </span>
          <span className="font-mono-label">/</span>
        </footer>
      </article>
    </main>
  );
}
