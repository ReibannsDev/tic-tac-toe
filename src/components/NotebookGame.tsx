'use client';

import React, { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import {
  checkWinner,
  countMoves,
  createPageGrids,
  getGridStatus,
  getNextTurn,
  GRID_COUNT,
  isBoardFull,
  type GridState,
  type Player,
  type ScoreState,
} from '@/lib/game';
import { FocusedGridOverlay } from './FocusedGridOverlay';
import { HandSymbolIcon, INK_COLORS } from './HandMark';
import { SpiralBinding } from './SpiralBinding';
import { TicTacToeBoard } from './TicTacToeBoard';

const STORAGE_KEY = 'paper-tictactoe-state-v1';

interface NotebookState {
  pageNumber: number;
  grids: GridState[];
  score: ScoreState;
  nextStarter: Player;
}

const DEFAULT_STATE: NotebookState = {
  pageNumber: 1,
  grids: createPageGrids(GRID_COUNT),
  score: { X: 0, O: 0, ties: 0 },
  nextStarter: 'X',
};

let storeState: NotebookState = DEFAULT_STATE;
let storageLoaded = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function loadFromStorageOnce() {
  if (storageLoaded || typeof window === 'undefined') return;
  storageLoaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<NotebookState>;
    if (
      typeof parsed.pageNumber === 'number' &&
      Array.isArray(parsed.grids) &&
      parsed.grids.length === GRID_COUNT &&
      parsed.score &&
      (parsed.nextStarter === 'X' || parsed.nextStarter === 'O')
    ) {
      storeState = {
        pageNumber: parsed.pageNumber,
        grids: parsed.grids,
        score: parsed.score,
        nextStarter: parsed.nextStarter,
      };
    }
  } catch {
    // Ignore storage read errors
  }
}

function updateStore(updater: (prev: NotebookState) => NotebookState) {
  const next = updater(storeState);
  if (next === storeState) return;
  storeState = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storeState));
    } catch {
      // Ignore storage quota errors
    }
  }
  emitChange();
}

function subscribe(listener: () => void): () => void {
  loadFromStorageOnce();
  listeners.add(listener);
  // Notify once after mount if storage differed from default SSR snapshot
  queueMicrotask(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NotebookState {
  loadFromStorageOnce();
  return storeState;
}

function getServerSnapshot(): NotebookState {
  return DEFAULT_STATE;
}

export function NotebookGame() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { pageNumber, grids, score, nextStarter } = state;

  // Focus / FLIP animation state
  const [focusedGridId, setFocusedGridId] = useState<number | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [wasFinishedOnOpen, setWasFinishedOnOpen] = useState(false);
  const [lastPlayedCell, setLastPlayedCell] = useState<number | null>(null);
  const [pageFlipping, setPageFlipping] = useState(false);

  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleSelectGrid = useCallback(
    (gridId: number) => {
      if (focusedGridId !== null) return;
      const el = cellRefs.current[gridId];
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const targetGrid = grids[gridId];
      const isAlreadyFinished = Boolean(targetGrid.winner || targetGrid.isDraw);

      // If opening a brand-new empty grid, assign it the fair alternating starter
      if (countMoves(targetGrid.board) === 0 && !isAlreadyFinished) {
        updateStore((prev) => ({
          ...prev,
          grids: prev.grids.map((g) =>
            g.id === gridId ? { ...g, startingPlayer: prev.nextStarter } : g
          ),
        }));
      }

      setSourceRect(rect);
      setWasFinishedOnOpen(isAlreadyFinished);
      setLastPlayedCell(null);
      setIsClosing(false);
      setFocusedGridId(gridId);
    },
    [focusedGridId, grids]
  );

  const handleCellClick = useCallback((gridId: number, cellIndex: number) => {
    updateStore((prev) => {
      const target = prev.grids[gridId];
      if (!target || target.winner || target.isDraw) return prev;
      if (target.board[cellIndex] !== null) return prev;

      const turn = getNextTurn(target);
      const nextBoard = [...target.board];
      nextBoard[cellIndex] = turn;

      const win = checkWinner(nextBoard);
      const draw = !win && isBoardFull(nextBoard);

      const nextScore = { ...prev.score };
      let nextStarterPlayer = prev.nextStarter;

      if (win) {
        nextScore[win.winner] += 1;
        nextStarterPlayer = prev.nextStarter === 'X' ? 'O' : 'X';
      } else if (draw) {
        nextScore.ties += 1;
        nextStarterPlayer = prev.nextStarter === 'X' ? 'O' : 'X';
      }

      const updated: GridState = {
        ...target,
        board: nextBoard,
        winner: win ? win.winner : null,
        winLine: win ? win.line : null,
        isDraw: draw,
      };

      const nextGrids = [...prev.grids];
      nextGrids[gridId] = updated;

      return {
        ...prev,
        grids: nextGrids,
        score: nextScore,
        nextStarter: nextStarterPlayer,
      };
    });

    setLastPlayedCell(cellIndex);
  }, []);

  const getSourceRect = useCallback(() => {
    if (focusedGridId === null) return null;
    return cellRefs.current[focusedGridId]?.getBoundingClientRect() ?? null;
  }, [focusedGridId]);

  const handleRequestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  const handleCloseComplete = useCallback(() => {
    setFocusedGridId(null);
    setSourceRect(null);
    setIsClosing(false);
    setLastPlayedCell(null);
  }, []);

  const handleNewPage = useCallback(() => {
    if (focusedGridId !== null) return;
    setPageFlipping(true);
    window.setTimeout(() => {
      updateStore((prev) => ({
        ...prev,
        pageNumber: prev.pageNumber + 1,
        grids: createPageGrids(GRID_COUNT),
      }));
      setPageFlipping(false);
    }, 180);
  }, [focusedGridId]);

  const handleResetScore = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      score: { X: 0, O: 0, ties: 0 },
      nextStarter: 'X',
    }));
  }, []);

  const completedCount = grids.filter((g) => g.winner || g.isDraw).length;
  const inProgressCount = grids.filter(
    (g) => !g.winner && !g.isDraw && countMoves(g.board) > 0
  ).length;
  const focusedGrid = focusedGridId !== null ? grids[focusedGridId] : null;

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center px-2 py-4 sm:px-6 sm:py-8">
      {/* Stacked pages illusion underneath the active notebook sheet */}
      <div className="relative w-full max-w-[780px]">
        <div
          className="pointer-events-none absolute inset-0 translate-x-[5px] translate-y-[6px] rounded-[6px] border border-[#b9b09f] bg-[#e9e3d5] shadow-md"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 translate-x-[2px] translate-y-[3px] rounded-[6px] border border-[#c3baa8] bg-[#efeadd]"
          aria-hidden="true"
        />

        {/* Main dotted notebook paper page */}
        <section
          aria-label="Tic-tac-toe notebook page"
          className={`paper-sheet relative rounded-[6px] border border-[#c8bfae] pt-5 pr-10 pb-6 pl-4 shadow-[0_14px_34px_rgba(38,31,22,0.18)] sm:pt-7 sm:pr-14 sm:pb-8 sm:pl-8 ${
            pageFlipping ? 'opacity-60 transition-opacity duration-150' : ''
          }`}
        >
          {/* Vector dot-grid pattern layer */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full rounded-[5px]"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="notebook-dots"
                width="18"
                height="18"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="9" cy="9" r="1.05" fill="#bfb7a6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#notebook-dots)" />
          </svg>

          {/* Right-edge metallic spiral binding */}
          <SpiralBinding />

          {/* Notebook Header: Title, How to Play, & Sheet Controls */}
          <header className="relative z-10 mb-3 sm:mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-[family-name:var(--font-hand-display)] text-3xl leading-none font-bold tracking-wide text-[#24201b] sm:text-4xl">
                  Tic-Tac-Toe
                </h1>
                <p className="mt-1.5 text-sm text-[#574f43] sm:text-base">
                  Tap any grid to zoom in &amp; play. Click outside anytime to return.
                </p>
              </div>

              {/* Sheet & score controls */}
              <div className="flex items-center gap-2">
                {(score.X > 0 || score.O > 0 || score.ties > 0) && (
                  <button
                    type="button"
                    onClick={handleResetScore}
                    className="cursor-pointer rounded-full px-2.5 py-1 text-sm text-[#6e6558] underline decoration-dashed underline-offset-4 transition hover:text-[#24201b]"
                  >
                    Reset score
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNewPage}
                  className="cursor-pointer rounded-full border border-[#8e8474] bg-[#f8f5ec] px-3.5 py-1 text-sm font-medium text-[#24201b] shadow-xs transition hover:-translate-y-0.5 hover:border-[#24201b] hover:shadow-sm active:translate-y-0 sm:text-base"
                >
                  New Sheet
                </button>
              </div>
            </div>
          </header>

          {/* Sticky Scoreboard & Always-Visible Next Starter Bar */}
          <div className="paper-sheet paper-dots sticky top-2 z-30 mb-4 rounded-lg border border-dashed border-[#c7beae] p-2 shadow-[0_4px_12px_rgba(38,31,22,0.08)] sm:mb-6 sm:p-2.5">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              <div className="flex items-center justify-between rounded-md border border-[#1c2b4a]/25 bg-[#1c2b4a]/[0.03] px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <HandSymbolIcon player="X" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <span className="text-xs text-[#3c362e] sm:text-base">Player X</span>
                </div>
                <span
                  className="font-[family-name:var(--font-hand-display)] text-xl leading-none font-bold sm:text-3xl"
                  style={{ color: INK_COLORS.X }}
                >
                  {score.X}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-md border border-[#8d8476]/30 bg-[#24201b]/[0.02] px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                <span className="text-xs text-[#5d5549] sm:text-base">Ties</span>
                <span className="font-[family-name:var(--font-hand-display)] text-xl leading-none font-bold text-[#5d5549] sm:text-3xl">
                  {score.ties}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-md border border-[#b3342b]/25 bg-[#b3342b]/[0.03] px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <HandSymbolIcon player="O" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <span className="text-xs text-[#3c362e] sm:text-base">Player O</span>
                </div>
                <span
                  className="font-[family-name:var(--font-hand-display)] text-xl leading-none font-bold sm:text-3xl"
                  style={{ color: INK_COLORS.O }}
                >
                  {score.O}
                </span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#d5ccbc] pt-1.5 text-xs text-[#6b6255] sm:text-sm">
              <span>
                {completedCount}/{GRID_COUNT} finished
                {inProgressCount > 0 ? ` · ${inProgressCount} in play` : ''}
              </span>
              <div className="flex items-center gap-1.5 font-medium text-[#3b352c]">
                <span>Next fresh grid starts with</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#cfc6b6] bg-[#faf7f0] px-2 py-0.5">
                  <HandSymbolIcon player={nextStarter} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </div>
            </div>
          </div>

          {/* 5 columns × 7 rows of hand-drawn tic-tac-toe grids */}
          <div className="relative z-10 grid grid-cols-5 gap-2.5 sm:gap-4 md:gap-5">
            {grids.map((grid) => {
              const status = getGridStatus(grid);
              const isFocused = focusedGridId === grid.id;

              return (
                <button
                  key={`${pageNumber}-${grid.id}`}
                  type="button"
                  onClick={() => handleSelectGrid(grid.id)}
                  aria-label={`Grid #${grid.id + 1}${
                    status === 'won'
                      ? `, won by ${grid.winner}`
                      : status === 'draw'
                        ? ', draw'
                        : status === 'playing'
                          ? ', in progress'
                          : ', empty'
                  }`}
                  className={`group relative rounded-lg p-1 transition-[transform,background-color] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/50 sm:p-1.5 ${
                    isFocused
                      ? 'pointer-events-none'
                      : 'cursor-pointer hover:scale-[1.07] hover:bg-[#24201b]/[0.04] active:scale-[0.98]'
                  } ${
                    status === 'playing'
                      ? 'ring-1 ring-dashed ring-[#8a7f6d]/60 bg-[#24201b]/[0.02]'
                      : ''
                  } ${
                    grid.winner === 'X'
                      ? 'bg-[#1c2b4a]/[0.035]'
                      : grid.winner === 'O'
                        ? 'bg-[#b3342b]/[0.035]'
                        : status === 'draw'
                          ? 'bg-[#24201b]/[0.025]'
                          : ''
                  }`}
                >
                  <div
                    ref={(el) => {
                      cellRefs.current[grid.id] = el;
                    }}
                    className={isFocused ? 'opacity-0' : undefined}
                  >
                    <TicTacToeBoard grid={grid} pageNumber={pageNumber} sizeVariant="mini" />
                  </div>

                  {/* Subtle corner mark for in-progress or finished grids */}
                  {status === 'playing' && (
                    <span
                      className="absolute right-1 bottom-0.5 h-1.5 w-1.5 rounded-full bg-[#7a6f5d]/70"
                      title="In progress"
                    />
                  )}
                  {status === 'draw' && (
                    <span className="pointer-events-none absolute right-1 bottom-0 text-[10px] leading-none text-[#756c5f] sm:text-xs">
                      –
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Centered enlarged playable/inspectable overlay */}
      {focusedGrid && sourceRect && (
        <FocusedGridOverlay
          grid={focusedGrid}
          pageNumber={pageNumber}
          sourceRect={sourceRect}
          getSourceRect={getSourceRect}
          lastPlayedCell={lastPlayedCell}
          wasFinishedOnOpen={wasFinishedOnOpen}
          isClosing={isClosing}
          onCellClick={handleCellClick}
          onRequestClose={handleRequestClose}
          onCloseComplete={handleCloseComplete}
        />
      )}
    </main>
  );
}
