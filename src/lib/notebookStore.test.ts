import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPageGrids, GRID_COUNT } from './game';
import { createDefaultState, normalizeName, parseStoredState, playerLabel } from './notebookStore';

const validPayload = () => JSON.parse(JSON.stringify(createDefaultState()));

describe('parseStoredState', () => {
  it('accepts a freshly created state', () => {
    const parsed = parseStoredState(JSON.stringify(validPayload()));
    expect(parsed).not.toBeNull();
    expect(parsed?.grids).toHaveLength(GRID_COUNT);
  });

  it('re-derives winner, win line and draw from the board', () => {
    const data = validPayload();
    data.grids[3].board = ['O', 'O', 'O', 'X', 'X', null, 'X', null, null];
    data.grids[3].startingPlayer = 'X';
    data.grids[3].winner = null; // stored flags are wrong on purpose
    data.grids[3].isDraw = true;

    const grid = parseStoredState(JSON.stringify(data))!.grids[3];
    expect(grid.winner).toBe('O');
    expect(grid.winLine).toEqual([0, 1, 2]);
    expect(grid.isDraw).toBe(false);
  });

  it.each([
    ['null', null],
    ['invalid JSON', '{not json'],
    ['a non-object', '42'],
  ])('rejects %s', (_label, raw) => {
    expect(parseStoredState(raw)).toBeNull();
  });

  it.each<[string, (d: ReturnType<typeof validPayload>) => void]>([
    ['the wrong number of grids', (d) => d.grids.pop()],
    ['a board of the wrong length', (d) => d.grids[0].board.push(null)],
    ['an unknown mark', (d) => (d.grids[0].board[0] = 'Z')],
    ['an impossible mark count', (d) => (d.grids[0].board = ['O', 'O', null, null, null, null, null, null, null])],
    ['a bad starting player', (d) => (d.grids[0].startingPlayer = 'Q')],
    ['a negative score', (d) => (d.score.X = -1)],
    ['a fractional score', (d) => (d.score.ties = 0.5)],
    ['a missing score', (d) => delete d.score],
    ['a bad next starter', (d) => (d.nextStarter = 'Z')],
  ])('rejects %s', (_label, corrupt) => {
    const data = validPayload();
    corrupt(data);
    expect(parseStoredState(JSON.stringify(data))).toBeNull();
  });

  it('defaults soundEnabled when missing', () => {
    const data = validPayload();
    delete data.soundEnabled;
    expect(parseStoredState(JSON.stringify(data))?.soundEnabled).toBe(true);
  });

  it('loads older saves without player names', () => {
    const data = validPayload();
    delete data.playerNames;
    expect(parseStoredState(JSON.stringify(data))?.playerNames).toEqual({ X: '', O: '' });
  });

  it('defaults the theme to the system setting when missing or unknown', () => {
    const data = validPayload();
    delete data.theme;
    expect(parseStoredState(JSON.stringify(data))?.theme).toBe('system');
    data.theme = 'sepia';
    expect(parseStoredState(JSON.stringify(data))?.theme).toBe('system');
    data.theme = 'night';
    expect(parseStoredState(JSON.stringify(data))?.theme).toBe('night');
  });

  it('cleans stored names instead of rejecting the save', () => {
    const data = validPayload();
    data.playerNames = { X: '  Maya   Lee ', O: 42 };
    expect(parseStoredState(JSON.stringify(data))?.playerNames).toEqual({ X: 'Maya Lee', O: '' });
  });
});

describe('player names', () => {
  it('normalizes whitespace and caps the length', () => {
    expect(normalizeName('  Sam  ')).toBe('Sam');
    expect(normalizeName('a'.repeat(30))).toHaveLength(20);
  });

  it('falls back to the default label for a blank name', () => {
    expect(playerLabel({ X: 'Maya', O: '' }, 'X')).toBe('Maya');
    expect(playerLabel({ X: 'Maya', O: '' }, 'O')).toBe('Player O');
  });
});

describe('store actions', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('scores a win once and rotates the next starter', async () => {
    const store = await import('./notebookStore');
    for (const cell of [0, 3, 1, 4]) expect(store.playMove(0, cell)).not.toBeNull();
    expect(store.playMove(0, 2)?.outcome).toBe('win');
    expect(store.getNotebookState().score).toEqual({ X: 1, O: 0, ties: 0 });
    expect(store.getNotebookState().nextStarter).toBe('O');

    // A rejected move afterwards must not change the score again
    expect(store.playMove(0, 8)).toBeNull();
    expect(store.getNotebookState().score).toEqual({ X: 1, O: 0, ties: 0 });
  });

  it('counts a draw as a tie', async () => {
    const store = await import('./notebookStore');
    for (const cell of [0, 1, 2, 4, 3, 5, 7, 6, 8]) store.playMove(0, cell);
    expect(store.getNotebookState().score).toEqual({ X: 0, O: 0, ties: 1 });
  });

  it('gives a newly opened grid the rotated starter, but never a started one', async () => {
    const store = await import('./notebookStore');
    for (const cell of [0, 3, 1, 4, 2]) store.playMove(0, cell); // X wins, O starts next
    store.playMove(1, 4); // grid 1 already started by X
    store.assignStarterIfUntouched(1);
    store.assignStarterIfUntouched(2);
    expect(store.getNotebookState().grids[1].startingPlayer).toBe('X');
    expect(store.getNotebookState().grids[2].startingPlayer).toBe('O');
  });

  it('keeps the score when clearing the sheet, and resets it on demand', async () => {
    const store = await import('./notebookStore');
    for (const cell of [0, 3, 1, 4, 2]) store.playMove(0, cell);
    store.clearSheet();
    expect(store.getNotebookState().grids).toEqual(createPageGrids(GRID_COUNT));
    expect(store.getNotebookState().score.X).toBe(1);

    store.resetScore();
    expect(store.getNotebookState().score).toEqual({ X: 0, O: 0, ties: 0 });
    expect(store.getNotebookState().nextStarter).toBe('X');
  });

  it('keeps player names through a new sheet and a score reset', async () => {
    const store = await import('./notebookStore');
    store.setPlayerName('X', '  Maya ');
    store.setPlayerName('O', 'Sam');
    store.clearSheet();
    store.resetScore();
    expect(store.getNotebookState().playerNames).toEqual({ X: 'Maya', O: 'Sam' });

    store.setPlayerName('O', '   ');
    expect(store.getNotebookState().playerNames.O).toBe('');
  });
});
