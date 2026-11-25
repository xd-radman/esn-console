/**
 * Header.jsx — Persistent Global Navigation & Workspace Toolbar
 * Renders across every view:
 * - Left: ESN Star logo + Brand button (`/`), plus dashboard-only controls when
 *   viewing `/project/:projectId` (`All Projects` back button, Project Switcher
 *   dropdown, and Prediction Sidebar toggle).
 * - Right: `EN | TR` segmented language switcher, Light/Dark theme button, and
 *   the circular Profile button toggling `ProfilePopover`.
 */

import { useCallback, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Moon, PanelRight, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import ProfilePopover from './ProfilePopover.jsx';

// Sample project options used in the header switcher until Phase 2/4 project state is wired
const SAMPLE_PROJECTS = [
  { id: 'speaking-club', labelKey: 'nav.sampleProjects.speakingClub' },
  { id: 'cappadocia-trip', labelKey: 'nav.sampleProjects.cappadociaTrip' },
  { id: 'buddy-system', labelKey: 'nav.sampleProjects.buddySystem' },
];

export default function Header({ isSidebarOpen = false, onToggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  // Open/closed state for the account ProfilePopover
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Stable IDs for accessible label/control and aria-controls associations
  const switcherId = useId();
  const popoverId = useId();

  // Ref to the circular profile button for outside-click exclusion & Escape focus restore
  const profileTriggerRef = useRef(null);

  // Parse `/project/:projectId` from the current pathname to reveal dashboard-only controls
  const projectMatch = location.pathname.match(/^\/project\/([^/]+)/);
  const activeProjectId = projectMatch ? decodeURIComponent(projectMatch[1]) : null;

  // Include any custom `:projectId` URL slug in the select list so controlled value stays valid
  const hasKnownSample = SAMPLE_PROJECTS.some((item) => item.id === activeProjectId);

  const closeProfile = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  // Navigate to `/` and close any open popover
  const handleGoHome = () => {
    setIsProfileOpen(false);
    navigate('/');
  };

  // Navigate to the newly selected sample project route
  const handleProjectSwitch = (event) => {
    const nextProjectId = event.target.value;
    if (nextProjectId) {
      navigate(`/project/${encodeURIComponent(nextProjectId)}`);
    }
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        {/* Left region: ESN Star brand button + conditional dashboard route controls */}
        <div className="site-header-start">
          <button
            type="button"
            className="brand-button"
            onClick={handleGoHome}
          >
            <img
              src="/esnstar_logo.png"
              alt=""
              width="28"
              height="28"
              className="brand-logo"
            />
            <span className="brand-wordmark font-editorial">{t('brand')}</span>
          </button>

          {/* Dashboard-only controls shown exclusively on `/project/:projectId` */}
          {activeProjectId && (
            <nav
              className="dashboard-nav"
              aria-label={t('nav.controlsLabel')}
            >
              <span className="header-divider" aria-hidden="true" />

              {/* Back to All Projects (`/`) button */}
              <button
                type="button"
                className="btn ghost header-back-btn"
                onClick={handleGoHome}
              >
                <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('nav.allProjects')}</span>
              </button>

              {/* Accessible native Project Switcher select */}
              <div className="project-switcher-wrap">
                <label htmlFor={switcherId} className="visually-hidden">
                  {t('nav.switchProject')}
                </label>
                <select
                  id={switcherId}
                  name="project-switcher"
                  className="project-switcher-select"
                  value={activeProjectId}
                  onChange={handleProjectSwitch}
                >
                  {SAMPLE_PROJECTS.map((project) => (
                    <option key={project.id} value={project.id}>
                      {t(project.labelKey)}
                    </option>
                  ))}
                  {!hasKnownSample && (
                    <option value={activeProjectId}>{activeProjectId}</option>
                  )}
                </select>
                <ChevronDown
                  size={14}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="project-switcher-chevron"
                />
              </div>

              {/* Collapsible organizer prediction sidebar toggle */}
              <button
                type="button"
                className="btn header-sidebar-btn"
                aria-pressed={isSidebarOpen}
                aria-label={t('nav.toggleSidebar')}
                onClick={onToggleSidebar}
              >
                <PanelRight size={15} strokeWidth={1.5} aria-hidden="true" />
                <span className="header-sidebar-label">{t('nav.sidebarShort')}</span>
              </button>
            </nav>
          )}
        </div>

        {/* Right region: EN | TR segmented toggle, theme toggle, and profile popover trigger */}
        <div className="site-header-end">
          {/* Segmented bilingual switcher (`EN | TR`) */}
          <div
            className="segmented-control"
            role="group"
            aria-label={t('lang.switcherLabel')}
          >
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

          {/* Light / Dark theme toggle button */}
          <button
            type="button"
            className="btn header-theme-btn"
            onClick={toggleTheme}
            aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
          >
            {isDark ? (
              <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
            <span className="header-theme-label">
              {isDark ? t('theme.light') : t('theme.dark')}
            </span>
          </button>

          {/* Circular profile trigger + anchored ProfilePopover immediately following */}
          <div className="profile-anchor">
            <button
              ref={profileTriggerRef}
              type="button"
              className="profile-trigger"
              aria-expanded={isProfileOpen}
              aria-controls={popoverId}
              aria-label={t('profile.triggerLabel')}
              onClick={() => setIsProfileOpen((prev) => !prev)}
            >
              <span aria-hidden="true">{t('profile.monogram')}</span>
            </button>

            <ProfilePopover
              id={popoverId}
              isOpen={isProfileOpen}
              onClose={closeProfile}
              triggerRef={profileTriggerRef}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
