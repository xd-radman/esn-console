/**
 * StatusSelect.jsx — Synchronized Active / Inactive Pill Dropdown (with Optional Delete)
 * Reusable status control rendered on both Landing `ProjectCard` tiles and
 * the `ProjectDashboard` header. Stops event propagation on pointer/click
 * events so toggling status or opening Delete Project inside a clickable card
 * never triggers card navigation.
 * When `disabled` is true (non-admin / view-only), renders as a non-interactive
 * Swiss status pill without dropdown affordances.
 */

import { useEffect, useId, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  Trash2,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function StatusSelect({
  status,
  onChange,
  onDelete,
  projectTitle = '',
  disabled = false,
}) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef(null);

  const isActive = status === 'active';
  const statusLabel = isActive ? t('status.active') : t('status.inactive');

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Render a clean read-only status pill for users without `manage_projects`
  if (disabled) {
    return (
      <span
        className={`status-select ${isActive ? 'active' : 'inactive'} is-readonly`}
        aria-label={`${t('status.changeFor', { project: projectTitle })}: ${statusLabel}`}
      >
        <span className="status-select-readonly-icon" aria-hidden="true">
          {isActive ? (
            <CircleCheck size={13} strokeWidth={1.5} />
          ) : (
            <CircleDashed size={13} strokeWidth={1.5} />
          )}
        </span>
        <span className="status-select-readonly-text font-mono-label">
          {statusLabel}
        </span>
      </span>
    );
  }

  // Prevent pointer/click events from bubbling up to parent card click handlers
  const stopBubble = (event) => {
    event.stopPropagation();
  };

  const handleToggleMenu = (event) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleSelectStatus = (event, nextStatus) => {
    event.stopPropagation();
    setIsOpen(false);
    if (nextStatus !== status) {
      onChange?.(nextStatus);
    }
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    setIsOpen(false);
    onDelete?.();
  };

  return (
    <div
      ref={containerRef}
      className={`status-select ${isActive ? 'active' : 'inactive'} ${
        isOpen ? 'is-open' : ''
      }`}
      onClick={stopBubble}
      onMouseDown={stopBubble}
    >
      <button
        type="button"
        className="status-select-trigger font-mono-label"
        aria-label={`${t('status.changeFor', { project: projectTitle })}: ${statusLabel}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={handleToggleMenu}
      >
        <span className="status-select-readonly-icon" aria-hidden="true">
          {isActive ? (
            <CircleCheck size={13} strokeWidth={1.5} />
          ) : (
            <CircleDashed size={13} strokeWidth={1.5} />
          )}
        </span>
        <span>{statusLabel}</span>
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          aria-hidden="true"
          className="status-select-trigger-chevron"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="bento-card elevated status-dropdown-menu"
          aria-label={t('status.changeFor', { project: projectTitle })}
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={isActive}
            className={`status-dropdown-item ${isActive ? 'is-selected' : ''}`}
            onClick={(event) => handleSelectStatus(event, 'active')}
          >
            <CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('status.active')}</span>
            {isActive && (
              <Check
                size={13}
                strokeWidth={1.75}
                aria-hidden="true"
                className="status-dropdown-check"
              />
            )}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={!isActive}
            className={`status-dropdown-item ${!isActive ? 'is-selected' : ''}`}
            onClick={(event) => handleSelectStatus(event, 'inactive')}
          >
            <CircleDashed size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('status.inactive')}</span>
            {!isActive && (
              <Check
                size={13}
                strokeWidth={1.75}
                aria-hidden="true"
                className="status-dropdown-check"
              />
            )}
          </button>

          {onDelete && (
            <>
              <div className="status-dropdown-divider" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="status-dropdown-item is-danger"
                onClick={handleDeleteClick}
              >
                <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('status.deleteProject')}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
