/**
 * ProjectCard.jsx — Overhauled Metric Bento Directory Card
 * Renders a compact Swiss × Bento project tile (`min-height: 210px`) with:
 * - Top row: square `lucide-react` project icon + monospace code pill on the left,
 *   and the interactive `StatusSelect` pill on the right, centered on one axis
 * - Body: Newsreader linked title directly above a 2-line clamped Inter description
 * - Metric Footer: hairline divider, two stacked metric blocks (`SESSIONS` &
 *   `RESPONSES`) on the left, and a directional `ArrowRight` cue on the far right
 * Uses the stretched-link pattern (`.card-link::after`) plus card `onClick` guard
 * so the full tile navigates to `/project/:id` while `StatusSelect` stays independent.
 */

import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Compass,
  FolderKanban,
  Globe,
  HeartHandshake,
  MessagesSquare,
  Music,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import StatusSelect from './StatusSelect.jsx';

// Maps `project.iconKey` values from `initialProjects.js` / `NewProjectModal` to 1.5px Lucide icons
const PROJECT_ICONS = {
  'messages-square': MessagesSquare,
  compass: Compass,
  users: Users,
  sparkles: Sparkles,
  globe: Globe,
  music: Music,
  award: Award,
  'heart-handshake': HeartHandshake,
};

export default function ProjectCard({
  project,
  onStatusChange,
  onEditProject,
  onDeleteProject,
  canEditStatus = true,
}) {
  const { lang, t } = useLang();
  const navigate = useNavigate();

  // Select localized metadata (`en` or `tr`) with safe English fallback
  const copy = project[lang] ?? project.en;
  const IconComponent = PROJECT_ICONS[project.iconKey] ?? FolderKanban;
  const targetPath = `/project/${encodeURIComponent(project.id)}`;

  // Fallback card click handler ignoring clicks originating from interactive child controls
  const handleCardClick = (event) => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.target.closest('a, button, select, label')) {
      return;
    }
    navigate(targetPath);
  };

  return (
    <article
      className={`bento-card project-card ${project.status === 'inactive' ? 'is-inactive' : ''}`}
      onClick={handleCardClick}
    >
      {/* Top row: square project icon + monospace code pill paired with StatusSelect */}
      <header className="project-card-header">
        <div className="project-card-identity">
          <span className="project-card-icon" aria-hidden="true">
            <IconComponent size={18} strokeWidth={1.5} />
          </span>
          <span className="mono-tag project-code-tag">{project.code}</span>
        </div>

        <StatusSelect
          status={project.status}
          projectTitle={copy.title}
          disabled={!canEditStatus}
          onChange={(nextStatus) => onStatusChange?.(project.id, nextStatus)}
          onEdit={
            canEditStatus && onEditProject
              ? () => onEditProject(project)
              : undefined
          }
          onDelete={
            canEditStatus && onDeleteProject
              ? () => onDeleteProject(project)
              : undefined
          }
        />
      </header>

      {/* Main body: linked editorial heading and 2-line clamped description */}
      <div className="project-card-body">
        <h2 className="font-editorial project-card-title">
          <Link to={targetPath} className="card-link">
            {copy.title}
          </Link>
        </h2>

        <p className="project-card-subtitle">{copy.subtitle}</p>
      </div>

      {/* Metric footer: stacked Sessions/Responses counts on left and ArrowRight cue on far right */}
      <footer className="project-card-footer">
        <dl className="project-card-metrics tabular-nums">
          <div className="project-metric">
            <dt className="project-metric-label">{t('card.sessions')}</dt>
            <dd className="project-metric-value">{project.sessionsCount}</dd>
          </div>

          <div className="project-metric">
            <dt className="project-metric-label">{t('card.responses')}</dt>
            <dd className="project-metric-value">{project.responsesCount}</dd>
          </div>
        </dl>

        <span className="project-card-cta" aria-hidden="true">
          <ArrowRight size={16} strokeWidth={1.5} />
        </span>
      </footer>
    </article>
  );
}
