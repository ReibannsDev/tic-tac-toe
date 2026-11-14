import { useSyncExternalStore } from 'react';
import {
  applyMove,
  checkWinner,
  countMoves,
  createPageGrids,
  GRID_COUNT,
  isBoardFull,
  otherPlayer,
  type CellValue,
  type GridState,
  type MoveResult,
  type Player,
  type ScoreState,
} from './game';

/**
 * The notebook's persistent state (grids, score, starter rotation, sound
 * preference), kept in a tiny external store backed by localStorage so it
 * survives reloads and stays SSR-safe via useSyncExternalStore.
 */

export interface NotebookState {
  grids: GridState[];
  score: ScoreState;
  nextStarter: Player;
  soundEnabled: boolean;
}

export const STORAGE_KEY = 'paper-tictactoe-state-v1';

export function createDefaultState(): NotebookState {
  return {
    grids: createPageGrids(GRID_COUNT),
    score: { X: 0, O: 0, ties: 0 },
    nextStarter: 'X',
    soundEnabled: true,
  };
}

const DEFAULT_STATE = createDefaultState();

// ---------------------------------------------------------------------------
// Validation of persisted data
// ---------------------------------------------------------------------------

const isPlayer = (v: unknown): v is Player => v === 'X' || v === 'O';
const isCell = (v: unknown): v is CellValue => v === null || isPlayer(v);
const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/**
 * Rebuilds one grid from its stored board. Winner, win line and draw flag are
 * re-derived from the board rather than trusted, so they can never disagree.
 * Returns null for anything that could not come from real play.
 */
function parseGrid(raw: unknown, id: number): GridState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { board, startingPlayer } = raw as Record<string, unknown>;
  if (!Array.isArray(board) || board.length !== 9 || !board.every(isCell)) return null;
  if (!isPlayer(startingPlayer)) return null;

  const starterMarks = board.filter((c) => c === startingPlayer).length;
  const otherMarks = board.filter((c) => c === otherPlayer(startingPlayer)).length;
  const diff = starterMarks - otherMarks;
  if (diff !== 0 && diff !== 1) return null;

  const win = checkWinner(board);
  return {
    id,
    board: [...board],
    startingPlayer,
    winner: win ? win.winner : null,
    winLine: win ? win.line : null,
    isDraw: !win && isBoardFull(board),
  };
}

/**
 * Parses a localStorage payload. Any malformed part means the whole payload is
 * discarded (returns null) and the app starts from a fresh sheet.
 */
export function parseStoredState(raw: string | null): NotebookState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { grids, score, nextStarter, soundEnabled } = data as Record<string, unknown>;

  if (!Array.isArray(grids) || grids.length !== GRID_COUNT) return null;
  const parsedGrids: GridState[] = [];
  for (let i = 0; i < grids.length; i++) {
    const grid = parseGrid(grids[i], i);
    if (!grid) return null;
    parsedGrids.push(grid);
  }

  if (typeof score !== 'object' || score === null) return null;
  const { X, O, ties } = score as Record<string, unknown>;
  if (!isCount(X) || !isCount(O) || !isCount(ties)) return null;

  if (!isPlayer(nextStarter)) return null;

  return {
    grids: parsedGrids,
    score: { X, O, ties },
    nextStarter,
    soundEnabled: typeof soundEnabled === 'boolean' ? soundEnabled : true,
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let storeState: NotebookState = DEFAULT_STATE;
let storageLoaded = false;
const listeners = new Set<() => void>();

function loadFromStorageOnce() {
  if (storageLoaded || typeof window === 'undefined') return;
  storageLoaded = true;
  try {
    const parsed = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
    if (parsed) storeState = parsed;
  } catch {
    // Storage unavailable (private mode, blocked site data): keep defaults
  }
}

function setState(next: NotebookState) {
  if (next === storeState) return;
  storeState = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / unavailable storage
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
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

/** Current state outside React (for tests and event handlers). */
export function getNotebookState(): NotebookState {
  return getSnapshot();
}

export function useNotebookStore(): NotebookState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Gives an untouched grid the current fair-rotation starter when it is opened. */
export function assignStarterIfUntouched(gridId: number): void {
  const grid = storeState.grids[gridId];
  if (!grid || grid.winner || grid.isDraw || countMoves(grid.board) > 0) return;
  if (grid.startingPlayer === storeState.nextStarter) return;

  const grids = [...storeState.grids];
  grids[gridId] = { ...grid, startingPlayer: storeState.nextStarter };
  setState({ ...storeState, grids });
}

/**
 * Plays the next mark in a grid, updating score and starter rotation when the
 * round ends. Returns the move result (for sounds/animation) or null if the
 * move was not allowed.
 */
export function playMove(gridId: number, cellIndex: number): MoveResult | null {
  const grid = storeState.grids[gridId];
  if (!grid) return null;
  const result = applyMove(grid, cellIndex);
  if (!result) return null;

  const grids = [...storeState.grids];
  grids[gridId] = result.grid;

  const score = { ...storeState.score };
  let nextStarter = storeState.nextStarter;
  if (result.outcome === 'win') {
    score[result.player] += 1;
    nextStarter = otherPlayer(nextStarter);
  } else if (result.outcome === 'draw') {
    score.ties += 1;
    nextStarter = otherPlayer(nextStarter);
  }

  setState({ ...storeState, grids, score, nextStarter });
  return result;
}

/** Clears every grid on the sheet; score and starter rotation are kept. */
export function clearSheet(): void {
  setState({ ...storeState, grids: createPageGrids(GRID_COUNT) });
}

export function resetScore(): void {
  setState({ ...storeState, score: { X: 0, O: 0, ties: 0 }, nextStarter: 'X' });
}

export function setSoundEnabled(enabled: boolean): void {
  if (storeState.soundEnabled === enabled) return;
  setState({ ...storeState, soundEnabled: enabled });
}
