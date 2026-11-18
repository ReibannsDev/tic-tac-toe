export type Player = 'X' | 'O';
export type CellValue = Player | null;

export interface WinResult {
  winner: Player;
  line: [number, number, number];
}

export type GridStatus = 'empty' | 'playing' | 'won' | 'draw';

export interface GridState {
  id: number;
  board: CellValue[];
  startingPlayer: Player;
  winner: Player | null;
  winLine: [number, number, number] | null;
  isDraw: boolean;
}

export interface ScoreState {
  X: number;
  O: number;
  ties: number;
}

export const GRID_COUNT = 35; // 5 columns × 7 rows, matching the notebook page
export const SHEET_COLUMNS = 5;

export const WINNING_LINES: readonly [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkWinner(board: CellValue[]): WinResult | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    const first = board[a];
    if (first && first === board[b] && first === board[c]) {
      return { winner: first, line };
    }
  }
  return null;
}

export function isBoardFull(board: CellValue[]): boolean {
  return board.every((cell) => cell !== null);
}

export function countMoves(board: CellValue[]): number {
  let count = 0;
  for (const cell of board) {
    if (cell !== null) count++;
  }
  return count;
}

export function getNextTurn(grid: GridState): Player {
  const moves = countMoves(grid.board);
  return moves % 2 === 0 ? grid.startingPlayer : otherPlayer(grid.startingPlayer);
}

export function getGridStatus(grid: GridState): GridStatus {
  if (grid.winner) return 'won';
  if (grid.isDraw) return 'draw';
  if (countMoves(grid.board) > 0) return 'playing';
  return 'empty';
}

export type MoveOutcome = 'continue' | 'win' | 'draw';

export interface MoveResult {
  grid: GridState;
  player: Player;
  outcome: MoveOutcome;
}

/**
 * Places the next player's mark in `cellIndex`. Returns null when the move is
 * not allowed (grid finished, cell taken, or index out of range).
 */
export function applyMove(grid: GridState, cellIndex: number): MoveResult | null {
  if (grid.winner || grid.isDraw) return null;
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) return null;
  if (grid.board[cellIndex] !== null) return null;

  const player = getNextTurn(grid);
  const board = [...grid.board];
  board[cellIndex] = player;

  const win = checkWinner(board);
  const isDraw = !win && isBoardFull(board);

  return {
    grid: {
      ...grid,
      board,
      winner: win ? win.winner : null,
      winLine: win ? win.line : null,
      isDraw,
    },
    player,
    outcome: win ? 'win' : isDraw ? 'draw' : 'continue',
  };
}

export function otherPlayer(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

export function createEmptyGrid(id: number, startingPlayer: Player = 'X'): GridState {
  return {
    id,
    board: Array<CellValue>(9).fill(null),
    startingPlayer,
    winner: null,
    winLine: null,
    isDraw: false,
  };
}

export function createPageGrids(count: number = GRID_COUNT): GridState[] {
  return Array.from({ length: count }, (_, id) => createEmptyGrid(id, 'X'));
}
