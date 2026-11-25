/**
 * FeedbackTable.jsx — Searchable Student Feedback & Suggestions Table
 * Renders a Swiss Bento card with a real-time `<search>` filter input and a
 * keyboard-scrollable responsive table displaying each response's JetBrains Mono
 * session badge, formatted date range, score pill, highlight (`note1`), and
 * suggestion (`note2`).
 */

import { useId, useMemo, useState } from 'react';
import { MessageSquareText, Search, SearchX, X } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';

export default function FeedbackTable({ responses = [], formatDateRange }) {
  const { lang, t } = useLang();
  const [searchQuery, setSearchQuery] = useState('');

  const searchInputId = useId();
  const captionId = useId();

  // Filter responses in real time across highlights, suggestions, session titles, and categories
  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const ordered = [...responses].reverse();

    if (!query) {
      return ordered;
    }

    return ordered.filter((row) => {
      const haystack = [
        row.note1,
        row.note2,
        row.sessionTitle,
        row.startDate,
        row.cat1,
        row.cat2,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [responses, searchQuery]);

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <section className="bento-card feedback-section" aria-label={t('feedback.sectionTitle')}>
      {/* Section header with title, match count badge, and semantic `<search>` control */}
      <header className="feedback-header">
        <div className="feedback-heading">
          <h2 className="font-editorial">{t('feedback.sectionTitle')}</h2>
          <span className="font-mono-label dashboard-section-count tabular-nums">
            {visibleRows.length} / {responses.length}
          </span>
        </div>

        <search className="feedback-search-wrap">
          <label htmlFor={searchInputId} className="visually-hidden">
            {t('feedback.searchLabel')}
          </label>
          <Search
            size={15}
            strokeWidth={1.5}
            aria-hidden="true"
            className="feedback-search-icon"
          />
          <input
            id={searchInputId}
            type="search"
            name="feedback-search"
            className="feedback-search-input"
            placeholder={t('feedback.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {hasQuery && (
            <button
              type="button"
              className="btn ghost feedback-search-clear"
              aria-label={t('feedback.clearSearch')}
              onClick={() => setSearchQuery('')}
            >
              <X size={14} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </search>
      </header>

      {/* Crisp empty state when no notes exist or no rows match the active search */}
      {visibleRows.length === 0 ? (
        <div className="feedback-empty-state">
          {hasQuery ? (
            <SearchX size={22} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <MessageSquareText size={22} strokeWidth={1.5} aria-hidden="true" />
          )}
          <p>{hasQuery ? t('feedback.emptySearch') : t('feedback.emptyAll')}</p>
        </div>
      ) : (
        /* Keyboard-focusable scrollable table container with sticky column/row headers */
        <div
          tabIndex={0}
          role="region"
          aria-labelledby={captionId}
          className="table-wrapper"
        >
          <table className="feedback-table">
            <caption id={captionId} className="visually-hidden">
              {t('feedback.tableCaption')}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t('feedback.sessionCol')}</th>
                <th scope="col">{t('feedback.dateCol')}</th>
                <th scope="col">{t('feedback.scoreCol')}</th>
                <th scope="col">{t('feedback.highlightCol')}</th>
                <th scope="col">{t('feedback.suggestionCol')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const scoreTier =
                  row.score >= 4 ? 'high' : row.score === 3 ? 'mid' : 'low';
                const formattedDate = formatDateRange
                  ? formatDateRange(row.startDate, row.endDate, lang)
                  : row.startDate;

                return (
                  <tr key={row.id}>
                    <th scope="row">
                      <span className="mono-tag feedback-session-tag">
                        {row.sessionTitle}
                      </span>
                    </th>
                    <td className="tabular-nums cell-mono">{formattedDate}</td>
                    <td className="tabular-nums">
                      <span className={`font-mono-label score-pill ${scoreTier}`}>
                        {row.score ?? '—'} / 5
                      </span>
                    </td>
                    <td className="feedback-highlight-cell">{row.note1 || '—'}</td>
                    <td className="feedback-suggestion-cell">{row.note2 || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
