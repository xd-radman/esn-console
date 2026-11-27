/**
 * Header.jsx — Persistent Global Navigation & Workspace Toolbar
 * Renders across every view:
 * - Left: ESN Star logo + Brand button (`/`), plus project-scoped controls when
 *   viewing `/project/:projectId` (`All Projects` back button, Project Switcher
 *   dropdown populated live from `DataContext`, and the Swiss `Analytics | Predictor`
 *   segmented view switcher gated by `use_retention_predictor`).
 * - Right: `EN | TR` segmented language switcher, Light/Dark theme button, and
 *   the circular Profile button toggling `ProfilePopover`.
 */

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Cpu,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import ProfilePopover from './ProfilePopover.jsx';
import AccountSettingsModal from './modals/AccountSettingsModal.jsx';
import TeamPermissionsModal from './modals/TeamPermissionsModal.jsx';

/**
 * Derives a two-character uppercase monogram from a user's full name or email.
 */
function buildMonogram(fullName, email, fallback) {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return fallback;
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const { user, profile, hasPermission, canViewInactiveProjects } = useAuth();
  const { projects } = useData();

  // Filter Project Switcher options so inactive projects are visible only to leadership
  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (project) => project.status === 'active' || canViewInactiveProjects
      ),
    [projects, canViewInactiveProjects]
  );

  const canViewWorkspace = hasPermission('view_workspace');
  const canUsePredictor = hasPermission('use_retention_predictor');
  const canManageRoles = hasPermission('manage_roles');

  const googleFullName =
    user?.user_metadata?.full_name || user?.user_metadata?.name;
  const userMonogram = buildMonogram(
    profile?.full_name || googleFullName,
    profile?.email ?? user?.email,
    t('profile.monogram')
  );

  // Open/closed state for the account ProfilePopover and portaled settings modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);

  // Stable IDs for accessible label/control and aria-controls associations
  const switcherId = useId();
  const popoverId = useId();

  // Ref to the circular profile button for outside-click exclusion & Escape focus restore
  const profileTriggerRef = useRef(null);

  // Parse `/project/:projectId` (and optional `/predictor` suffix) from the current pathname
  const projectMatch = location.pathname.match(/^\/project\/([^/]+)(\/predictor)?\/?$/);
  const activeProjectId = projectMatch ? decodeURIComponent(projectMatch[1]) : null;
  const isPredictorView = Boolean(projectMatch?.[2]);

  // Include any custom `:projectId` URL slug in the select list so controlled value stays valid
  const hasKnownProject = visibleProjects.some((item) => item.id === activeProjectId);

  const closeProfile = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsProfileOpen(false);
    setIsSettingsOpen(true);
  }, []);

  const handleOpenTeam = useCallback(() => {
    setIsProfileOpen(false);
    setIsTeamOpen(true);
  }, []);

  // Navigate to `/` and close any open popover
  const handleGoHome = () => {
    setIsProfileOpen(false);
    navigate('/');
  };

  // Navigate to the newly selected project, preserving Predictor view when permitted
  const handleProjectSwitch = (event) => {
    const nextProjectId = event.target.value;
    if (nextProjectId) {
      const encoded = encodeURIComponent(nextProjectId);
      const nextPath =
        isPredictorView && canUsePredictor
          ? `/project/${encoded}/predictor`
          : `/project/${encoded}`;
      navigate(nextPath);
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

          {/* Dashboard-only controls shown exclusively when user can view workspace on `/project/:projectId` */}
          {canViewWorkspace && activeProjectId && (
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

              {/* Accessible native Project Switcher select bound to live DataContext projects */}
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
                  {visibleProjects.map((project) => {
                    const copy = project[lang] ?? project.en;
                    return (
                      <option key={project.id} value={project.id}>
                        {copy.title}
                      </option>
                    );
                  })}
                  {!hasKnownProject && (
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

              {/* Swiss segmented view switcher (`Analytics | Predictor`), gated by `use_retention_predictor` */}
              {canUsePredictor && (
                <div
                  className="view-switcher"
                  role="group"
                  aria-label={t('nav.viewSwitcherLabel')}
                >
                  <Link
                    to={`/project/${encodeURIComponent(activeProjectId)}`}
                    className="view-switcher-link"
                    aria-current={!isPredictorView ? 'page' : undefined}
                  >
                    <BarChart3 size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('nav.analyticsTab')}</span>
                  </Link>
                  <Link
                    to={`/project/${encodeURIComponent(activeProjectId)}/predictor`}
                    className="view-switcher-link"
                    aria-current={isPredictorView ? 'page' : undefined}
                  >
                    <Cpu size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>{t('nav.predictorTab')}</span>
                  </Link>
                </div>
              )}
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
              <span aria-hidden="true">{userMonogram}</span>
            </button>

            <ProfilePopover
              id={popoverId}
              isOpen={isProfileOpen}
              onClose={closeProfile}
              triggerRef={profileTriggerRef}
              onOpenSettings={handleOpenSettings}
              onOpenTeam={handleOpenTeam}
            />
          </div>
        </div>
      </div>

      {/* Portaled Notion-style Account Settings & Admin-only Team Permissions modals */}
      <AccountSettingsModal
        key={isSettingsOpen ? 'settings-open' : 'settings-closed'}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {canManageRoles && (
        <TeamPermissionsModal
          isOpen={isTeamOpen}
          onClose={() => setIsTeamOpen(false)}
        />
      )}
    </header>
  );
}
