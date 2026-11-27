/**
 * FeedbackTable.jsx — Interactive Excel-Style Project Data / Responses Table
 * Retains the `FeedbackTable` filename/export so existing imports stay intact,
 * while rendering all project-wide enabled columns (`getActiveColumns`) plus a
 * Session column in a hairline-bordered spreadsheet grid with:
 * - Search-by-Column dropdown (`All Columns`, `Session`, or any enabled column)
 * - Real-time search input and filtered/total row counter badge
 * - Column visibility picker popover (`Select All` / `Clear` + per-column checkboxes)
 * - Click-to-sort column headers (numeric sort for `number`, alphabetical for text/category)
 * - Clean client-side pagination (`25` or `50` rows per page) for large CSVs
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Database,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import { getActiveColumns } from '../lib/csvSchema.js';

const PAGE_SIZE_OPTIONS = [25, 50];

/**
 * Formats a raw `extra_data` cell value cleanly for display.
 */
function formatCellValue(raw) {
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw).trim();
}

export default function FeedbackTable({ project, responses = [], formatDateRange }) {
  const { lang, t } = useLang();

  // Interactive toolbar, column visibility, sorting, and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('__all__');
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState(() => new Set());
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const searchInputId = useId();
  const searchColId = useId();
  const pageSizeId = useId();
  const captionId = useId();
  const colMenuRef = useRef(null);

  // All project-wide enabled (non-ignored, enabled !== false) columns
  const enabledColumns = useMemo(
    () => getActiveColumns(project?.config?.columns ?? []),
    [project]
  );

  // Visible columns after applying user's column-picker checkboxes
  const visibleColumns = useMemo(
    () => enabledColumns.filter((col) => !hiddenColumnKeys.has(col.key)),
    [enabledColumns, hiddenColumnKeys]
  );

  // Keep search-column selector valid if the project schema changes
  const effectiveSearchColumn =
    searchColumn === '__all__' ||
    searchColumn === '__session__' ||
    enabledColumns.some((col) => col.key === searchColumn)
      ? searchColumn
      : '__all__';

  // Close the Columns Picker popover on outside pointer click or Escape key
  useEffect(() => {
    if (!isColumnMenuOpen) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target)) {
        setIsColumnMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsColumnMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isColumnMenuOpen]);

  // 1. Real-time filtering against selected column or all visible columns + Session
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const baseRows = [...responses].reverse();

    if (!query) {
      return baseRows;
    }

    return baseRows.filter((row) => {
      if (effectiveSearchColumn === '__session__') {
        return String(row.sessionTitle ?? '').toLowerCase().includes(query);
      }

      if (effectiveSearchColumn !== '__all__') {
        const val = formatCellValue(row?.extra_data?.[effectiveSearchColumn]);
        return val.toLowerCase().includes(query);
      }

      // `__all__`: search across Session + all currently visible columns (fallback to enabled if all hidden)
      const colsToSearch =
        visibleColumns.length > 0 ? visibleColumns : enabledColumns;
      if (String(row.sessionTitle ?? '').toLowerCase().includes(query)) {
        return true;
      }
      return colsToSearch.some((col) =>
        formatCellValue(row?.extra_data?.[col.key]).toLowerCase().includes(query)
      );
    });
  }, [responses, searchQuery, effectiveSearchColumn, visibleColumns, enabledColumns]);

  // 2. Column sorting (numeric for `number` columns, case-insensitive alphabetical otherwise)
  const sortedRows = useMemo(() => {
    if (!sortConfig.key) {
      return filteredRows;
    }

    const dirMultiplier = sortConfig.direction === 'asc' ? 1 : -1;
    const matchedCol = enabledColumns.find((col) => col.key === sortConfig.key);
    const isNumeric = matchedCol?.type === 'number';
    const locale = lang === 'tr' ? 'tr' : 'en';

    return [...filteredRows].sort((a, b) => {
      if (sortConfig.key === '__session__') {
        const valA = String(a.sessionTitle ?? '');
        const valB = String(b.sessionTitle ?? '');
        return valA.localeCompare(valB, locale, { sensitivity: 'base' }) * dirMultiplier;
      }

      const rawA = a?.extra_data?.[sortConfig.key];
      const rawB = b?.extra_data?.[sortConfig.key];
      const strA = formatCellValue(rawA);
      const strB = formatCellValue(rawB);

      // Push empty cells to the bottom regardless of sort direction
      if (!strA && !strB) {
        return 0;
      }
      if (!strA) {
        return 1;
      }
      if (!strB) {
        return -1;
      }

      if (isNumeric) {
        const numA = typeof rawA === 'number' ? rawA : Number(strA);
        const numB = typeof rawB === 'number' ? rawB : Number(strB);
        const validA = Number.isFinite(numA);
        const validB = Number.isFinite(numB);
        if (!validA && !validB) {
          return 0;
        }
        if (!validA) {
          return 1;
        }
        if (!validB) {
          return -1;
        }
        return (numA - numB) * dirMultiplier;
      }

      return strA.localeCompare(strB, locale, { sensitivity: 'base' }) * dirMultiplier;
    });
  }, [filteredRows, sortConfig, enabledColumns, lang]);

  // 3. Pagination slicing (clamped safely to `1..totalPages`)
  const totalFiltered = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRows = useMemo(
    () => sortedRows.slice(startIndex, startIndex + pageSize),
    [sortedRows, startIndex, pageSize]
  );

  const showingStart = totalFiltered === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(startIndex + pageSize, totalFiltered);
  const hasQuery = searchQuery.trim().length > 0;

  // Toggle ascending / descending sort on any clicked column header
  const handleSortToggle = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: columnKey, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  // Toggle a single column in the Columns visibility picker
  const handleToggleColumnVisibility = (columnKey) => {
    setHiddenColumnKeys((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  const handleSelectAllColumns = () => {
    setHiddenColumnKeys(new Set());
  };

  const handleClearAllColumns = () => {
    setHiddenColumnKeys(new Set(enabledColumns.map((col) => col.key)));
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <ArrowUpDown
          size={13}
          strokeWidth={1.5}
          aria-hidden="true"
          className="data-sort-icon is-idle"
        />
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp
        size={13}
        strokeWidth={1.75}
        aria-hidden="true"
        className="data-sort-icon is-active"
      />
    ) : (
      <ArrowDown
        size={13}
        strokeWidth={1.75}
        aria-hidden="true"
        className="data-sort-icon is-active"
      />
    );
  };

  return (
    <section
      className="bento-card feedback-section data-table-section"
      aria-label={t('dataTable.sectionTitle')}
    >
      {/* Header row: Editorial title, filtered/total row counter, and interactive spreadsheet toolbar */}
      <header className="data-table-header">
        <div className="feedback-heading">
          <h2 className="font-editorial">{t('dataTable.sectionTitle')}</h2>
          <span className="font-mono-label dashboard-section-count tabular-nums">
            {totalFiltered} / {responses.length}
          </span>
        </div>

        {enabledColumns.length > 0 && (
          <div className="data-table-toolbar">
            {/* Search-by-Column target dropdown */}
            <div className="data-col-select-wrap">
              <label htmlFor={searchColId} className="visually-hidden">
                {t('dataTable.searchColumnLabel')}
              </label>
              <select
                id={searchColId}
                className="data-col-select"
                value={effectiveSearchColumn}
                onChange={(event) => {
                  setSearchColumn(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="__all__">{t('dataTable.allColumnsOption')}</option>
                <option value="__session__">{t('feedback.sessionCol')}</option>
                {enabledColumns.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="data-col-select-chevron"
              />
            </div>

            {/* Real-time search input */}
            <search className="feedback-search-wrap data-search-wrap">
              <label htmlFor={searchInputId} className="visually-hidden">
                {t('dataTable.searchLabel')}
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
                name="data-table-search"
                className="feedback-search-input"
                placeholder={t('dataTable.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
              {hasQuery && (
                <button
                  type="button"
                  className="btn ghost feedback-search-clear"
                  aria-label={t('feedback.clearSearch')}
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                >
                  <X size={14} strokeWidth={1.5} aria-hidden="true" />
                </button>
              )}
            </search>

            {/* Columns visibility picker popover */}
            <div className="data-col-picker" ref={colMenuRef}>
              <button
                type="button"
                className="btn data-col-picker-btn"
                aria-expanded={isColumnMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsColumnMenuOpen((prev) => !prev)}
              >
                <Columns3 size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('dataTable.columnsBtn')}</span>
                <span className="font-mono-label data-col-picker-count tabular-nums">
                  {visibleColumns.length}/{enabledColumns.length}
                </span>
              </button>

              {isColumnMenuOpen && (
                <div
                  className="bento-card elevated data-col-popover"
                  role="menu"
                  aria-label={t('dataTable.columnsPickerTitle')}
                >
                  <div className="data-col-popover-head hairline-bottom">
                    <span className="font-mono-label data-col-popover-title">
                      {t('dataTable.columnsPickerTitle')}
                    </span>
                    <div className="data-col-popover-actions">
                      <button
                        type="button"
                        className="btn ghost data-col-action-link"
                        onClick={handleSelectAllColumns}
                      >
                        {t('dataTable.selectAll')}
                      </button>
                      <button
                        type="button"
                        className="btn ghost data-col-action-link"
                        onClick={handleClearAllColumns}
                      >
                        {t('dataTable.clearAll')}
                      </button>
                    </div>
                  </div>

                  <div className="data-col-popover-list">
                    {enabledColumns.map((col) => {
                      const isChecked = !hiddenColumnKeys.has(col.key);
                      return (
                        <label key={col.key} className="data-col-option">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleColumnVisibility(col.key)}
                          />
                          <span className="data-col-option-label">{col.label}</span>
                          <span className="font-mono-label data-col-option-type">
                            {t(`modal.colTypes.${col.type}`)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Empty states: no enabled columns, or zero rows matching current filter */}
      {enabledColumns.length === 0 ? (
        <div className="feedback-empty-state">
          <Database size={22} strokeWidth={1.5} aria-hidden="true" />
          <p>{t('dataTable.noEnabledColumns')}</p>
        </div>
      ) : totalFiltered === 0 ? (
        <div className="feedback-empty-state">
          {hasQuery ? (
            <SearchX size={22} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Database size={22} strokeWidth={1.5} aria-hidden="true" />
          )}
          <p>{hasQuery ? t('dataTable.emptySearch') : t('dataTable.emptyAll')}</p>
        </div>
      ) : (
        <>
          {/* Spreadsheet scroll container with sticky header and hairline cell grid */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={captionId}
            className="data-table-scroll"
          >
            <table className="spreadsheet-table">
              <caption id={captionId} className="visually-hidden">
                {t('dataTable.tableCaption')}
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    aria-sort={
                      sortConfig.key === '__session__'
                        ? sortConfig.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="data-sort-btn"
                      onClick={() => handleSortToggle('__session__')}
                    >
                      <span>{t('feedback.sessionCol')}</span>
                      {renderSortIcon('__session__')}
                    </button>
                  </th>

                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        sortConfig.key === col.key
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="data-sort-btn"
                        onClick={() => handleSortToggle(col.key)}
                      >
                        <span>{col.label}</span>
                        {renderSortIcon(col.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((row) => {
                  const dateTooltip = formatDateRange
                    ? formatDateRange(row.startDate, row.endDate, lang)
                    : row.startDate;

                  return (
                    <tr key={row.id}>
                      <th scope="row" className="spreadsheet-session-cell">
                        <span
                          className="mono-tag feedback-session-tag"
                          title={dateTooltip || undefined}
                        >
                          {row.sessionTitle}
                        </span>
                      </th>

                      {visibleColumns.map((col) => {
                        const text = formatCellValue(row?.extra_data?.[col.key]);
                        const cellClass =
                          col.type === 'number'
                            ? 'spreadsheet-cell cell-numeric tabular-nums'
                            : col.type === 'text'
                              ? 'spreadsheet-cell cell-text'
                              : 'spreadsheet-cell cell-category';

                        return (
                          <td key={col.key} className={cellClass}>
                            {text || '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer: range summary, rows-per-page selector, and Prev/Next controls */}
          <footer className="data-table-footer hairline-top">
            <span className="font-mono-label data-pagination-summary tabular-nums">
              {t('dataTable.showingRange', {
                start: showingStart,
                end: showingEnd,
                total: totalFiltered,
              })}
            </span>

            <div className="data-pagination-controls">
              <div className="data-pagesize-group">
                <label htmlFor={pageSizeId} className="font-mono-label data-pagesize-label">
                  {t('dataTable.rowsPerPage')}
                </label>
                <div className="data-pagesize-wrap">
                  <select
                    id={pageSizeId}
                    className="data-pagesize-select tabular-nums"
                    value={String(pageSize)}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={String(size)}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="data-col-select-chevron"
                  />
                </div>
              </div>

              <div className="data-page-nav">
                <button
                  type="button"
                  className="btn ghost data-page-btn"
                  disabled={safePage <= 1}
                  aria-label={t('dataTable.prevPage')}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('dataTable.prev')}</span>
                </button>

                <span className="font-mono-label data-page-indicator tabular-nums">
                  {safePage} / {totalPages}
                </span>

                <button
                  type="button"
                  className="btn ghost data-page-btn"
                  disabled={safePage >= totalPages}
                  aria-label={t('dataTable.nextPage')}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                >
                  <span>{t('dataTable.next')}</span>
                  <ChevronRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}
