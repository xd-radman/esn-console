/**
 * ChartGrid.jsx — Customizable 12-Column Bento Graph Grid with 4-Way Pointer Reordering
 * Renders the Analytics section header (`+ Add Graph`), maps each configured graph
 * onto a responsive 12-column CSS Grid (`span-4`, `span-6`, `span-8`, `span-12`),
 * and supports desktop (`>= 640px`) handle-only pointer drag-and-reorder where:
 * - Native wheel & trackpad scrolling work freely mid-drag (never hijacked).
 * - The picked-up graph stays crisp (`0.96` opacity) and physically counter-reacts
 *   (`--drag-rx`, `--drag-tilt`) to horizontal movement without shifting sibling tiles.
 * - 4-direction & between-tile placement (`above`, `below`, `left`, `right`) works
 *   over cards, in gaps between cards/rows, and at the start/end of the grid.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { useLang } from '../context/LangContext.jsx';
import ChartTile from './ChartTile.jsx';
import AddGraphModal from './modals/AddGraphModal.jsx';

/**
 * Clamps a numeric value into `[min, max]`.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clears inline drag transform CSS variables from a tile element.
 */
function clearTileDragVars(tileEl) {
  if (!tileEl) {
    return;
  }
  tileEl.style.removeProperty('--drag-tx');
  tileEl.style.removeProperty('--drag-ty');
  tileEl.style.removeProperty('--drag-rx');
  tileEl.style.removeProperty('--drag-tilt');
}

/**
 * Resolves the target stationary tile and 4-way `placement` (`'above' | 'below' | 'left' | 'right'`)
 * across `.chart-grid`, covering card edges (top/bottom 22% vs left/right halves),
 * inter-card / inter-row gaps, empty columns beside 4/6/8-span tiles, and grid start/end.
 */
function resolveGridDropTarget(gridEl, clientX, clientY, draggedId) {
  if (!gridEl) {
    return null;
  }

  const gridRect = gridEl.getBoundingClientRect();
  // Ignore pointer positions far outside the vertical bounds of the chart grid
  if (clientY < gridRect.top - 110 || clientY > gridRect.bottom + 110) {
    return null;
  }

  const tileNodes = Array.from(gridEl.querySelectorAll('[data-graph-id]')).filter(
    (node) => node.getAttribute('data-graph-id') !== String(draggedId)
  );
  if (tileNodes.length === 0) {
    return null;
  }

  const measured = tileNodes.map((node) => ({
    id: node.getAttribute('data-graph-id'),
    rect: node.getBoundingClientRect(),
  }));

  // Above the very first tile or below the very last tile -> snap cleanly to grid start/end
  const firstTile = measured[0];
  const lastTile = measured[measured.length - 1];
  if (clientY < firstTile.rect.top - 10) {
    return { targetId: firstTile.id, placement: 'above' };
  }
  if (clientY > lastTile.rect.bottom + 10) {
    return { targetId: lastTile.id, placement: 'below' };
  }

  // Prioritize tiles sharing the pointer's vertical row band so empty columns/gaps map to that row
  const rowMatches = measured.filter(
    ({ rect }) => clientY >= rect.top - 20 && clientY <= rect.bottom + 20
  );
  const candidates = rowMatches.length > 0 ? rowMatches : measured;

  let best = null;
  let bestDistance = Infinity;

  for (const item of candidates) {
    const { rect } = item;
    const dx =
      clientX < rect.left
        ? rect.left - clientX
        : clientX > rect.right
          ? clientX - rect.right
          : 0;
    const dy =
      clientY < rect.top
        ? rect.top - clientY
        : clientY > rect.bottom
          ? clientY - rect.bottom
          : 0;
    const dist = Math.hypot(dx, dy);

    if (dist < bestDistance) {
      bestDistance = dist;
      best = item;
    }
  }

  if (!best) {
    return null;
  }

  const { rect } = best;

  // Pointer is in a horizontal gap above or below the nearest tile
  if (clientY < rect.top) {
    return { targetId: best.id, placement: 'above' };
  }
  if (clientY > rect.bottom) {
    return { targetId: best.id, placement: 'below' };
  }

  // Pointer is in a vertical column gap or empty grid space to the left/right of the tile
  if (clientX < rect.left) {
    return { targetId: best.id, placement: 'left' };
  }
  if (clientX > rect.right) {
    return { targetId: best.id, placement: 'right' };
  }

  // Pointer is inside `rect`: top 22% -> `above`, bottom 22% -> `below`, middle 56% -> `left` / `right`
  const relY = (clientY - rect.top) / Math.max(1, rect.height);
  if (relY <= 0.22) {
    return { targetId: best.id, placement: 'above' };
  }
  if (relY >= 0.78) {
    return { targetId: best.id, placement: 'below' };
  }

  const midX = rect.left + rect.width / 2;
  return {
    targetId: best.id,
    placement: clientX < midX ? 'left' : 'right',
  };
}

export default function ChartGrid({
  graphs = [],
  responses = [],
  sessions = [],
  columns = [],
  isAdmin = false,
  onAddGraph,
  onUpdateGraph,
  onRemoveGraph,
  onReorderGraphs,
}) {
  const { t } = useLang();
  const [isAddGraphOpen, setIsAddGraphOpen] = useState(false);
  const [editingGraph, setEditingGraph] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const gridRef = useRef(null);
  const dragSessionRef = useRef(null);
  const graphsRef = useRef(graphs);
  const onReorderRef = useRef(onReorderGraphs);

  // Keep latest graphs & callback accessible inside active window pointer/scroll listeners
  useEffect(() => {
    graphsRef.current = graphs;
    onReorderRef.current = onReorderGraphs;
  }, [graphs, onReorderGraphs]);

  const canReorder = Boolean(isAdmin && onReorderGraphs && graphs.length > 1);

  // Open modal in Add mode (fresh blank state) or Edit mode (pre-filled from tile)
  const handleOpenAddModal = () => {
    setEditingGraph(null);
    setIsAddGraphOpen(true);
  };

  const handleOpenEditModal = (graph) => {
    setEditingGraph(graph);
    setIsAddGraphOpen(true);
  };

  const handleCloseGraphModal = () => {
    setIsAddGraphOpen(false);
    setEditingGraph(null);
  };

  // Tear down any active pointer-drag session and clean up listeners, timers, and CSS vars
  const cleanupDragSession = useCallback(() => {
    const session = dragSessionRef.current;
    if (!session) {
      return;
    }
    dragSessionRef.current = null;

    if (session.settleTimer) {
      clearTimeout(session.settleTimer);
    }
    if (session.autoScrollRaf) {
      cancelAnimationFrame(session.autoScrollRaf);
    }
    session.detachListeners?.();
    clearTileDragVars(session.tileEl);

    setDraggedId(null);
    setDropTarget(null);
  }, []);

  // Ensure listeners are cleaned up if the component unmounts mid-drag
  useEffect(() => cleanupDragSession, [cleanupDragSession]);

  // Touch-safe mobile (`< 640px`) step reorder handler (`delta = -1` up, `+1` down)
  const handleStepMoveGraph = useCallback(
    (graphId, delta) => {
      if (!canReorder) {
        return;
      }
      const currentList = graphsRef.current ?? [];
      const fromIndex = currentList.findIndex(
        (item) => String(item.id) === String(graphId)
      );
      const toIndex = fromIndex + delta;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= currentList.length) {
        return;
      }

      const reordered = [...currentList];
      const [movedTile] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, movedTile);
      onReorderRef.current?.(reordered);
    },
    [canReorder]
  );

  const handleMoveGraphUp = useCallback(
    (graphId) => handleStepMoveGraph(graphId, -1),
    [handleStepMoveGraph]
  );

  const handleMoveGraphDown = useCallback(
    (graphId) => handleStepMoveGraph(graphId, 1),
    [handleStepMoveGraph]
  );

  // Start desktop pointer-based drag strictly from `.chart-drag-handle`
  const handleGripPointerDown = useCallback(
    (graphId, event) => {
      if (
        !canReorder ||
        event.button !== 0 ||
        typeof window === 'undefined' ||
        window.innerWidth < 640
      ) {
        return;
      }

      const gridEl = gridRef.current;
      if (!gridEl) {
        return;
      }

      const tileEl = Array.from(gridEl.querySelectorAll('[data-graph-id]')).find(
        (node) => node.getAttribute('data-graph-id') === String(graphId)
      );
      if (!tileEl) {
        return;
      }

      // Prevent text selection on grip press without blocking native wheel/trackpad scroll
      event.preventDefault();
      cleanupDragSession();

      const session = {
        graphId: String(graphId),
        tileEl,
        active: false,
        startClientX: event.clientX,
        startClientY: event.clientY,
        currentClientX: event.clientX,
        currentClientY: event.clientY,
        lastClientX: event.clientX,
        startScrollX: window.scrollX,
        startScrollY: window.scrollY,
        velX: 0,
        latestTarget: null,
        settleTimer: null,
        autoScrollRaf: null,
        detachListeners: null,
      };

      // Update picked-up card position, physical horizontal reaction, and 4-way drop target
      const syncDraggedFrame = (instantDx = 0) => {
        if (!dragSessionRef.current || dragSessionRef.current !== session) {
          return;
        }

        const tx =
          session.currentClientX -
          session.startClientX +
          (window.scrollX - session.startScrollX);
        const ty =
          session.currentClientY -
          session.startClientY +
          (window.scrollY - session.startScrollY);

        // Smooth horizontal velocity + clamped horizontal displacement from start X
        session.velX = clamp(session.velX * 0.65 + instantDx * 0.35, -36, 36);
        const deltaX = clamp(session.currentClientX - session.startClientX, -96, 96);

        // Counter-lean (`--drag-tilt`) and subtle horizontal counter-nudge (`--drag-rx`) on the picked-up card
        const rx = clamp(-session.velX * 0.42 - deltaX * 0.035, -12, 12);
        const tilt = clamp(-(session.velX * 0.22 + deltaX * 0.02), -4.2, 4.2);

        session.tileEl.style.setProperty('--drag-tx', `${tx.toFixed(1)}px`);
        session.tileEl.style.setProperty('--drag-ty', `${ty.toFixed(1)}px`);
        session.tileEl.style.setProperty('--drag-rx', `${rx.toFixed(1)}px`);
        session.tileEl.style.setProperty('--drag-tilt', `${tilt.toFixed(2)}deg`);

        // Settle the picked-up card upright smoothly when horizontal motion pauses
        if (session.settleTimer) {
          clearTimeout(session.settleTimer);
        }
        session.settleTimer = setTimeout(() => {
          if (dragSessionRef.current === session && session.tileEl) {
            session.velX = 0;
            session.tileEl.style.setProperty('--drag-rx', '0px');
            session.tileEl.style.setProperty('--drag-tilt', '0deg');
          }
        }, 90);

        const resolved = resolveGridDropTarget(
          gridRef.current,
          session.currentClientX,
          session.currentClientY,
          session.graphId
        );
        session.latestTarget = resolved;

        setDropTarget((prev) => {
          if (!resolved) {
            return prev === null ? prev : null;
          }
          if (
            prev &&
            String(prev.targetId) === String(resolved.targetId) &&
            prev.placement === resolved.placement
          ) {
            return prev;
          }
          return resolved;
        });
      };

      // Gentle viewport-edge auto-scroll loop supplementing free wheel/trackpad scrolling
      const runEdgeAutoScroll = () => {
        if (dragSessionRef.current !== session || !session.active) {
          session.autoScrollRaf = null;
          return;
        }
        const edgeZone = 64;
        let scrollStep = 0;
        if (session.currentClientY < edgeZone) {
          scrollStep = -10;
        } else if (session.currentClientY > window.innerHeight - edgeZone) {
          scrollStep = 10;
        }

        if (scrollStep !== 0) {
          window.scrollBy({ top: scrollStep, behavior: 'auto' });
          syncDraggedFrame(0);
          session.autoScrollRaf = requestAnimationFrame(runEdgeAutoScroll);
        } else {
          session.autoScrollRaf = null;
        }
      };

      const handlePointerMove = (moveEvent) => {
        const dxFromStart = moveEvent.clientX - session.startClientX;
        const dyFromStart = moveEvent.clientY - session.startClientY;

        if (!session.active) {
          if (Math.hypot(dxFromStart, dyFromStart) < 4) {
            return;
          }
          session.active = true;
          setDraggedId(session.graphId);
        }

        const instantDx = moveEvent.clientX - session.lastClientX;
        session.lastClientX = moveEvent.clientX;
        session.currentClientX = moveEvent.clientX;
        session.currentClientY = moveEvent.clientY;

        syncDraggedFrame(instantDx);

        if (!session.autoScrollRaf) {
          const edgeZone = 64;
          if (
            moveEvent.clientY < edgeZone ||
            moveEvent.clientY > window.innerHeight - edgeZone
          ) {
            session.autoScrollRaf = requestAnimationFrame(runEdgeAutoScroll);
          }
        }
      };

      // Keep picked-up card pinned to the cursor when scrolling freely with wheel/trackpad
      const handleWindowScroll = () => {
        if (!session.active) {
          return;
        }
        syncDraggedFrame(0);
      };

      const handlePointerUp = () => {
        const wasActive = session.active;
        const resolved = session.latestTarget;
        const sourceId = session.graphId;
        cleanupDragSession();

        if (!wasActive || !resolved || !resolved.targetId) {
          return;
        }
        if (String(resolved.targetId) === sourceId) {
          return;
        }

        const currentList = graphsRef.current ?? [];
        const movedTile = currentList.find((item) => String(item.id) === sourceId);
        if (!movedTile) {
          return;
        }

        // Removing `movedTile` first cleanly adjusts indices whether moving forward or backward
        const remaining = currentList.filter((item) => String(item.id) !== sourceId);
        const targetIdx = remaining.findIndex(
          (item) => String(item.id) === String(resolved.targetId)
        );
        if (targetIdx === -1) {
          return;
        }

        const insertAfter =
          resolved.placement === 'below' || resolved.placement === 'right';
        const insertIdx = insertAfter ? targetIdx + 1 : targetIdx;

        const reordered = [...remaining];
        reordered.splice(insertIdx, 0, movedTile);

        const hasOrderChanged = reordered.some(
          (item, index) => String(item.id) !== String(currentList[index]?.id)
        );
        if (hasOrderChanged) {
          onReorderRef.current?.(reordered);
        }
      };

      const handleCancel = () => {
        cleanupDragSession();
      };

      const handleKeyDown = (keyEvent) => {
        if (keyEvent.key === 'Escape') {
          cleanupDragSession();
        }
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handleCancel);
      window.addEventListener('blur', handleCancel);
      window.addEventListener('keydown', handleKeyDown);

      session.detachListeners = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('scroll', handleWindowScroll);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handleCancel);
        window.removeEventListener('blur', handleCancel);
        window.removeEventListener('keydown', handleKeyDown);
      };

      dragSessionRef.current = session;
    },
    [canReorder, cleanupDragSession]
  );

  return (
    <section className="chart-grid-section" aria-label={t('charts.sectionTitle')}>
      {/* Section header with graph count and `+ Add Graph` button */}
      <header className="chart-grid-header">
        <div className="chart-grid-heading">
          <h2 className="font-editorial">{t('charts.sectionTitle')}</h2>
          <span className="font-mono-label dashboard-section-count tabular-nums">
            {graphs.length}
          </span>
        </div>

        {isAdmin && (
          <div className="chart-grid-actions">
            <button
              type="button"
              className="btn primary"
              onClick={handleOpenAddModal}
            >
              <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{t('charts.addGraph')}</span>
            </button>
          </div>
        )}
      </header>

      {/* Swiss Empty State when all graph cards have been deleted */}
      {graphs.length === 0 ? (
        <article className="bento-card chart-empty-state">
          <span className="chart-empty-icon" aria-hidden="true">
            <BarChart3 size={24} strokeWidth={1.5} />
          </span>
          <h3 className="font-editorial">{t('charts.emptyTitle')}</h3>
          <p>{t('charts.emptySubtitle')}</p>
          {isAdmin && (
            <div className="chart-empty-actions">
              <button
                type="button"
                className="btn primary"
                onClick={handleOpenAddModal}
              >
                <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('charts.addGraph')}</span>
              </button>
            </div>
          )}
        </article>
      ) : (
        /* 12-column responsive Bento CSS Grid with 4-way (`above`/`below`/`left`/`right`) placement */
        <div
          ref={gridRef}
          className={`chart-grid ${draggedId ? 'is-reordering' : ''}`}
        >
          {graphs.map((graph, index) => {
            const isDraggedTile =
              Boolean(draggedId) && String(draggedId) === String(graph.id);
            const isTargetTile =
              Boolean(draggedId) &&
              String(dropTarget?.targetId) === String(graph.id) &&
              !isDraggedTile;

            return (
              <ChartTile
                key={graph.id}
                graph={graph}
                responses={responses}
                sessions={sessions}
                columns={columns}
                canRemove={isAdmin}
                canReorder={canReorder}
                isFirst={index === 0}
                isLast={index === graphs.length - 1}
                isDragging={isDraggedTile}
                isDragOver={isTargetTile}
                dropPlacement={isTargetTile ? dropTarget.placement : null}
                onGripPointerDown={handleGripPointerDown}
                onMoveUp={handleMoveGraphUp}
                onMoveDown={handleMoveGraphDown}
                onEdit={handleOpenEditModal}
                onRemove={onRemoveGraph}
              />
            );
          })}
        </div>
      )}

      {/* Add / Edit Graph tile configuration modal (keyed per open for clean initial state) */}
      {isAdmin && (
        <AddGraphModal
          key={isAddGraphOpen ? (editingGraph?.id ?? 'new-graph') : 'closed-graph'}
          isOpen={isAddGraphOpen}
          onClose={handleCloseGraphModal}
          onAdd={onAddGraph}
          onUpdate={onUpdateGraph}
          editingGraph={editingGraph}
          columns={columns}
        />
      )}
    </section>
  );
}
