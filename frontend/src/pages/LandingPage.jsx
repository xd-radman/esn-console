/**
 * LandingPage.jsx — Full-Bleed Bento Project Directory (`/`) & New Project Flow
 * Reads synchronized `projects` from `DataContext`, renders a compact branded
 * hero bar with inline search, permission-aware status filter, and `+ New Project`
 * trigger, followed by a full-bleed Bento directory tray containing live Mini KPI
 * Stat Pills and an equal-column metric card grid.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CircleCheck,
  FileText,
  FolderKanban,
  LoaderCircle,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import NewProjectModal from '../components/modals/NewProjectModal.jsx';
import EditProjectModal from '../components/modals/EditProjectModal.jsx';
import DeleteProjectModal from '../components/modals/DeleteProjectModal.jsx';

export default function LandingPage() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const { hasPermission, canViewInactiveProjects } = useAuth();
  const canManageProjects = hasPermission('manage_projects');
  const {
    projects,
    isLoading,
    isSeeding,
    loadError,
    updateProjectStatus,
    createProject,
    updateProject,
    deleteProject,
  } = useData();

  // Controls open/closed state for Create, Edit, and Delete project modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Live directory search query and status filter (`all` | `active` | `inactive`)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Guard against stale `inactive` filter if leadership permission is not granted
  const effectiveStatusFilter =
    statusFilter === 'inactive' && !canViewInactiveProjects ? 'all' : statusFilter;

  // Keep browser tab title localized on `/`
  useEffect(() => {
    document.title = t('landing.pageTitle');
  }, [t]);

  // Restrict inactive projects to leadership (`owner`, `president`, `vice_president`)
  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (project) => project.status === 'active' || canViewInactiveProjects
      ),
    [projects, canViewInactiveProjects]
  );

  // Aggregate live KPI totals across all visible projects for the hero kicker & KPI pills
  const directoryStats = useMemo(() => {
    let active = 0;
    let totalSessions = 0;
    let totalResponses = 0;

    for (const project of visibleProjects) {
      if (project.status === 'active') {
        active += 1;
      }
      totalSessions += project.sessionsCount ?? 0;
      totalResponses += project.responsesCount ?? 0;
    }

    return {
      totalProjects: visibleProjects.length,
      activeCount: active,
      totalSessions,
      totalResponses,
    };
  }, [visibleProjects]);

  // Apply real-time search (title, subtitle, code) and status filter over visible projects
  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return visibleProjects.filter((project) => {
      if (effectiveStatusFilter !== 'all' && project.status !== effectiveStatusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const copy = project[lang] ?? project.en ?? {};
      const haystack = `${copy.title ?? ''} ${copy.subtitle ?? ''} ${project.code ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [visibleProjects, effectiveStatusFilter, searchQuery, lang]);

  // Build available status filter choices (include Inactive only for top leadership)
  const filterOptions = useMemo(() => {
    const options = [
      { id: 'all', label: t('landing.filterAll') },
      { id: 'active', label: t('landing.filterActive') },
    ];
    if (canViewInactiveProjects) {
      options.push({ id: 'inactive', label: t('landing.filterInactive') });
    }
    return options;
  }, [canViewInactiveProjects, t]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || effectiveStatusFilter !== 'all';

  // Persist newly created dynamic-schema project to Supabase, close modal, and open its dashboard
  const handleCreateProject = useCallback(
    async (projectPayload) => {
      const created = await createProject(projectPayload);
      if (created) {
        setIsModalOpen(false);
        navigate(`/project/${encodeURIComponent(created.id)}`);
      }
      return created;
    },
    [createProject, navigate]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  return (
    <main className="landing-main">
      <div className="landing-shell">
        {/* Compact Branded Hero Bar: ESN Star + Title/Kicker on left, Search/Filter/CTA on right */}
        <header className="landing-hero-bar">
          <div className="landing-hero-brand">
            <img
              src="/esnstar_logo.png"
              alt=""
              width="46"
              height="46"
              className="landing-hero-logo"
            />

            <div className="landing-hero-titles">
              <h1 className="font-editorial landing-header-title">
                {t('landing.title')}
              </h1>

              <div className="landing-header-meta tabular-nums">
                <span className="landing-header-kicker">{t('landing.kicker')}</span>
                <span className="landing-header-sep" aria-hidden="true">·</span>
                <span className="landing-header-count">
                  {t('landing.totalProjects', { count: directoryStats.totalProjects })}
                </span>
                <span className="landing-header-sep" aria-hidden="true">·</span>
                <span className="landing-header-count is-active">
                  {t('landing.activeCount', { count: directoryStats.activeCount })}
                </span>
              </div>
            </div>
          </div>

          {/* Right action cluster: inline Search, permission-aware Status Filter, and + New Project */}
          <div className="landing-hero-actions">
            <div className="landing-search">
              <Search
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="landing-search-icon"
              />
              <input
                type="search"
                className="landing-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('landing.searchPlaceholder')}
                aria-label={t('landing.searchLabel')}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="landing-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('landing.clearSearch')}
                >
                  <X size={13} strokeWidth={1.5} aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              className="landing-status-filter"
              role="group"
              aria-label={t('landing.statusFilterLabel')}
            >
              <span className="landing-status-filter-icon" aria-hidden="true">
                <SlidersHorizontal size={13} strokeWidth={1.5} />
              </span>
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`landing-filter-btn ${
                    effectiveStatusFilter === option.id ? 'is-selected' : ''
                  }`}
                  aria-pressed={effectiveStatusFilter === option.id}
                  onClick={() => setStatusFilter(option.id)}
                >
                  <span className="landing-filter-btn-label">{option.label}</span>
                </button>
              ))}
            </div>

            {canManageProjects && (
              <button
                type="button"
                className="btn primary landing-new-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
                <span className="landing-new-btn-label">{t('landing.newProject')}</span>
              </button>
            )}
          </div>
        </header>

        {/* Loading skeletons, fetch error banner, or Full-Bleed Bento Directory Tray */}
        {isLoading && projects.length === 0 ? (
          <section
            className="landing-bento-directory"
            role="status"
            aria-live="polite"
          >
            <div className="bento-card workspace-loading-bar">
              <LoaderCircle
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
                className="auth-spinner"
              />
              <span className="font-mono-label">
                {isSeeding ? t('toast.seedingWorkspace') : t('toast.loadingDirectory')}
              </span>
            </div>

            <div className="skeleton-grid" aria-hidden="true">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="bento-card skeleton-card">
                  <div className="skeleton-bar short" />
                  <div className="skeleton-bar medium" />
                  <div className="skeleton-bar full" />
                  <div className="skeleton-bar short" />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            {loadError && (
              <div className="bento-card dashboard-banner error" role="alert">
                <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>
                  {t('dashboard.loadError')}: {loadError}
                </span>
              </div>
            )}

            <section
              className="landing-bento-directory"
              aria-label={t('landing.directoryLabel')}
            >
              {/* Bento directory header: concise section subtitle + live Mini KPI Stat Pills */}
              <div className="landing-bento-top">
                <p className="landing-bento-subtitle">{t('landing.subtitle')}</p>

                <div
                  className="landing-kpi-pills tabular-nums"
                  aria-label={t('landing.kpiStripLabel')}
                >
                  <div className="landing-kpi-pill">
                    <FolderKanban size={13} strokeWidth={1.5} aria-hidden="true" />
                    <span className="landing-kpi-label">{t('landing.kpiTotalProjects')}</span>
                    <span className="landing-kpi-value">{directoryStats.totalProjects}</span>
                  </div>

                  <div className="landing-kpi-pill is-active">
                    <CircleCheck size={13} strokeWidth={1.5} aria-hidden="true" />
                    <span className="landing-kpi-label">{t('landing.kpiActive')}</span>
                    <span className="landing-kpi-value">{directoryStats.activeCount}</span>
                  </div>

                  <div className="landing-kpi-pill">
                    <Calendar size={13} strokeWidth={1.5} aria-hidden="true" />
                    <span className="landing-kpi-label">{t('landing.kpiTotalSessions')}</span>
                    <span className="landing-kpi-value">{directoryStats.totalSessions}</span>
                  </div>

                  <div className="landing-kpi-pill">
                    <FileText size={13} strokeWidth={1.5} aria-hidden="true" />
                    <span className="landing-kpi-label">{t('landing.kpiTotalResponses')}</span>
                    <span className="landing-kpi-value">{directoryStats.totalResponses}</span>
                  </div>
                </div>
              </div>

              {/* Equal-width 3-column metric card grid or empty search state */}
              {filteredProjects.length > 0 ? (
                <div className="landing-directory">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      canEditStatus={canManageProjects}
                      onStatusChange={updateProjectStatus}
                      onEditProject={canManageProjects ? setProjectToEdit : undefined}
                      onDeleteProject={canManageProjects ? setProjectToDelete : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="landing-empty-state" role="status">
                  <span className="landing-empty-icon" aria-hidden="true">
                    <Search size={18} strokeWidth={1.5} />
                  </span>
                  <h2 className="font-editorial landing-empty-title">
                    {t('landing.emptySearchTitle')}
                  </h2>
                  <p className="landing-empty-subtitle">
                    {t('landing.emptySearchSubtitle')}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="btn landing-empty-reset"
                      onClick={handleResetFilters}
                    >
                      <span>{t('landing.resetFilters')}</span>
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Accessible native `<dialog>` modals for creating or permanently deleting a project (`manage_projects`) */}
      {canManageProjects && (
        <>
          <NewProjectModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onCreate={handleCreateProject}
            projects={projects}
          />

          <EditProjectModal
            key={projectToEdit?.id ?? 'edit-project-closed'}
            isOpen={Boolean(projectToEdit)}
            project={projectToEdit}
            onClose={() => setProjectToEdit(null)}
            onSave={updateProject}
          />

          <DeleteProjectModal
            key={projectToDelete?.id ?? 'delete-project-closed'}
            isOpen={Boolean(projectToDelete)}
            project={projectToDelete}
            sessionsCount={projectToDelete?.sessionsCount ?? 0}
            responsesCount={projectToDelete?.responsesCount ?? 0}
            onClose={() => setProjectToDelete(null)}
            onConfirm={deleteProject}
          />
        </>
      )}
    </main>
  );
}
