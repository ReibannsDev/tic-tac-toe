import { describe, expect, it } from 'vitest';
import {
  applyMove,
  checkWinner,
  createEmptyGrid,
  getGridStatus,
  getNextTurn,
  WINNING_LINES,
  type CellValue,
  type GridState,
} from './game';

/** Plays a sequence of cell indexes on a fresh grid, failing if any move is rejected. */
function play(cells: number[], startingPlayer: 'X' | 'O' = 'X'): GridState {
  let grid = createEmptyGrid(0, startingPlayer);
  for (const cell of cells) {
    const result = applyMove(grid, cell);
    if (!result) throw new Error(`move ${cell} was rejected`);
    grid = result.grid;
  }
  return grid;
}

describe('checkWinner', () => {
  it.each(WINNING_LINES.map((line) => [line]))('detects the line %j', (line) => {
    const board: CellValue[] = Array(9).fill(null);
    for (const i of line) board[i] = 'O';
    expect(checkWinner(board)).toEqual({ winner: 'O', line });
  });

  it('returns null for an empty or undecided board', () => {
    expect(checkWinner(Array(9).fill(null))).toBeNull();
    expect(checkWinner(['X', 'O', 'X', null, null, null, null, null, null])).toBeNull();
  });
});

describe('getNextTurn', () => {
  it('alternates starting from the grid starter', () => {
    expect(getNextTurn(createEmptyGrid(0, 'X'))).toBe('X');
    expect(getNextTurn(createEmptyGrid(0, 'O'))).toBe('O');
    expect(getNextTurn(play([4], 'O'))).toBe('X');
    expect(getNextTurn(play([4, 0], 'O'))).toBe('O');
  });
});

describe('applyMove', () => {
  it('places marks for alternating players', () => {
    const grid = play([0, 4]);
    expect(grid.board[0]).toBe('X');
    expect(grid.board[4]).toBe('O');
    expect(getGridStatus(grid)).toBe('playing');
  });

  it('rejects taken cells and out-of-range indexes', () => {
    const grid = play([0]);
    expect(applyMove(grid, 0)).toBeNull();
    expect(applyMove(grid, -1)).toBeNull();
    expect(applyMove(grid, 9)).toBeNull();
    expect(applyMove(grid, 1.5)).toBeNull();
  });

  it('reports a win on the move that completes a line', () => {
    const almost = play([0, 3, 1, 4]); // X: 0,1  O: 3,4
    const result = applyMove(almost, 2);
    expect(result?.outcome).toBe('win');
    expect(result?.player).toBe('X');
    expect(result?.grid.winner).toBe('X');
    expect(result?.grid.winLine).toEqual([0, 1, 2]);
    expect(getGridStatus(result!.grid)).toBe('won');
  });

  it('reports a draw when the board fills with no winner', () => {
    // X O X / X O O / O X X
    const almost = play([0, 1, 2, 4, 3, 5, 7, 6]);
    const result = applyMove(almost, 8);
    expect(result?.outcome).toBe('draw');
    expect(result?.grid.isDraw).toBe(true);
    expect(result?.grid.winner).toBeNull();
  });

  it('treats a winning ninth move as a win, not a draw', () => {
    // X X O / O X X / O O _  -> X plays 8 to complete the 0-4-8 diagonal on a full board
    const almost = play([0, 2, 1, 3, 4, 6, 5, 7]);
    expect(almost.winner).toBeNull();
    const result = applyMove(almost, 8);
    expect(result?.outcome).toBe('win');
    expect(result?.grid.winLine).toEqual([0, 4, 8]);
    expect(result?.grid.isDraw).toBe(false);
  });

  it('refuses moves on a finished grid', () => {
    const won = play([0, 3, 1, 4, 2]);
    expect(applyMove(won, 8)).toBeNull();
  });
});
