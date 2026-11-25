/**
 * App.jsx — Root Shell & Client-Side Route Table
 * Renders the outer `.app-shell` frame, a temporary Step 1.2 top test bar for
 * switching language (`EN | TR`) and theme (`Light | Dark`) across views, and
 * the React Router `<Routes>` mapping `/` and `/project/:projectId`.
 */

import { Link, Route, Routes } from 'react-router-dom';
import { Globe, Moon, Sun } from 'lucide-react';
import { useTheme } from './context/ThemeContext.jsx';
import { useLang } from './context/LangContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';

export default function App() {
  // Consume global theme and language state/actions for the top preview bar
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  return (
    <div className="app-shell">
      {/* Temporary Step 1.2 test header (superseded by persistent Header.jsx in Step 1.3) */}
      <header className="dev-topbar">
        <div className="dev-topbar-inner">
          {/* Brand home link */}
          <Link to="/" className="dev-topbar-brand">
            {t('brand')}
          </Link>

          {/* Language (`EN | TR`) and Light/Dark theme controls */}
          <div
            className="dev-topbar-controls"
            role="toolbar"
            aria-label={t('nav.testBarLabel')}
          >
            {/* Segmented bilingual toggle using `aria-pressed` state */}
            <div
              className="segmented-control"
              role="group"
              aria-label={t('lang.switcherLabel')}
            >
              <span className="segmented-icon" aria-hidden="true">
                <Globe size={14} strokeWidth={1.5} />
              </span>
              <button
                type="button"
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}
              >
                {t('lang.en')}
                <span className="visually-hidden"> (English)</span>
              </button>
              <button
                type="button"
                aria-pressed={lang === 'tr'}
                onClick={() => setLang('tr')}
              >
                {t('lang.tr')}
                <span className="visually-hidden"> (Türkçe)</span>
              </button>
            </div>

            {/* Theme toggle button switching between Swiss Studio Light and Warm Carbon Dark */}
            <button
              type="button"
              className="btn"
              onClick={toggleTheme}
              aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            >
              {isDark ? (
                <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
              )}
              <span>{isDark ? t('theme.light') : t('theme.dark')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Primary client-side routes for the landing directory and project dashboard */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/project/:projectId" element={<ProjectDashboard />} />
      </Routes>
    </div>
  );
}
