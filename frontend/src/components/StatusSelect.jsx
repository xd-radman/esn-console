/**
 * StatusSelect.jsx — Synchronized Active / Inactive Pill Dropdown (or Read-Only Pill)
 * Reusable status control rendered on both Landing `ProjectCard` tiles and
 * the `ProjectDashboard` header. Stops event propagation on pointer/click
 * and change events so toggling status inside a clickable card never navigates.
 * When `disabled` is true (non-admin member view), renders as a non-interactive
 * Swiss status pill without dropdown affordances.
 */

import { useId } from 'react';
import { ChevronDown, CircleCheck, CircleDashed } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function StatusSelect({
  status,
  onChange,
  projectTitle = '',
  disabled = false,
}) {
  const { t } = useLang();
  const selectId = useId();
  const isActive = status === 'active';
  const statusLabel = isActive ? t('status.active') : t('status.inactive');

  // Render a clean read-only status pill for non-admin members
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

  // Emit updated status (`'active' | 'inactive'`) without triggering card navigation
  const handleStatusChange = (event) => {
    event.stopPropagation();
    onChange?.(event.target.value);
  };

  return (
    <div
      className={`status-select ${isActive ? 'active' : 'inactive'}`}
      onClick={stopBubble}
      onMouseDown={stopBubble}
    >
      {/* Non-color status icon so Active vs. Inactive is clear without relying on color alone */}
      <span className="status-select-icon" aria-hidden="true">
        {isActive ? (
          <CircleCheck size={13} strokeWidth={1.5} />
        ) : (
          <CircleDashed size={13} strokeWidth={1.5} />
        )}
      </span>

      <label htmlFor={selectId} className="visually-hidden">
        {t('status.changeFor', { project: projectTitle })}
      </label>

      <select
        id={selectId}
        name="project-status"
        className="status-select-control font-mono-label"
        value={status}
        onClick={stopBubble}
        onChange={handleStatusChange}
      >
        <option value="active">{t('status.active')}</option>
        <option value="inactive">{t('status.inactive')}</option>
      </select>

      <ChevronDown
        size={12}
        strokeWidth={1.5}
        aria-hidden="true"
        className="status-select-chevron"
      />
    </div>
  );
}
