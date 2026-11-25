/**
 * ProjectCard.jsx — Equal-Width Bento Directory Card with Stretched Link
 * Renders a 320px-tall Swiss × Bento project tile containing:
 * - Top bar: JetBrains Mono project code chip + interactive `StatusSelect` pill
 * - Body: `lucide-react` project icon, category tag, Newsreader title (`<Link>`), and Inter subtitle
 * - Footer: Session count, Response count, and directional arrow cue
 * Uses the stretched-link pattern (`.card-link::after`) plus card `onClick` guard
 * so the entire tile navigates to `/project/:id` while `StatusSelect` remains independent.
 */

import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Award,
  CalendarRange,
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

export default function ProjectCard({ project, onStatusChange }) {
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
      {/* Top row: monospace project code tag and independent Active/Inactive dropdown */}
      <header className="project-card-header">
        <span className="mono-tag project-code-tag">{project.code}</span>
        <StatusSelect
          status={project.status}
          projectTitle={copy.title}
          onChange={(nextStatus) => onStatusChange?.(project.id, nextStatus)}
        />
      </header>

      {/* Main content region: icon badge, category label, linked editorial heading, and subtitle */}
      <div className="project-card-content">
        <div className="project-card-identity">
          <span className="project-card-icon" aria-hidden="true">
            <IconComponent size={20} strokeWidth={1.5} />
          </span>
          <span className="font-mono-label project-card-category">
            {copy.category}
          </span>
        </div>

        <h2 className="font-editorial project-card-title">
          <Link to={targetPath} className="card-link">
            {copy.title}
          </Link>
        </h2>

        <p className="project-card-subtitle">{copy.subtitle}</p>
      </div>

      {/* Hairline footer displaying tabular session/response totals and hover arrow */}
      <footer className="project-card-footer hairline-top">
        <dl className="project-card-metrics tabular-nums">
          <div className="project-metric">
            <dt className="font-mono-label">{t('card.sessions')}</dt>
            <dd>
              <CalendarRange size={13} strokeWidth={1.5} aria-hidden="true" />
              <span>{project.sessionsCount}</span>
            </dd>
          </div>

          <div className="project-metric">
            <dt className="font-mono-label">{t('card.responses')}</dt>
            <dd>
              <span>{project.responsesCount}</span>
            </dd>
          </div>
        </dl>

        <span className="project-card-cta" aria-hidden="true">
          <ArrowUpRight size={17} strokeWidth={1.5} />
        </span>
      </footer>
    </article>
  );
}
