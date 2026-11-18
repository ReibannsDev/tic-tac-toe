import { describe, expect, it } from 'vitest';
import { pickSpatialCandidate, type Box } from './spatialNav';

/** A rows × cols layout of `size` boxes with `gap` between them, in reading order. */
function layout(rows: number, cols: number, size = 100, gap = 0, jitter = 0): Box[] {
  const boxes: Box[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const left = c * (size + gap) - jitter;
      const top = r * (size + gap) - jitter;
      boxes.push({ left, top, right: left + size + 2 * jitter, bottom: top + size + 2 * jitter });
    }
  }
  return boxes;
}

function move(boxes: Box[], from: number, direction: Parameters<typeof pickSpatialCandidate>[2]) {
  const others = boxes.map((b, i) => ({ b, i })).filter(({ i }) => i !== from);
  const picked = pickSpatialCandidate(
    boxes[from],
    others.map(({ b }) => b),
    direction
  );
  return picked === -1 ? -1 : others[picked].i;
}

describe('pickSpatialCandidate', () => {
  const board = layout(3, 3);

  it('moves to the adjacent cell in each direction', () => {
    expect(move(board, 4, 'up')).toBe(1);
    expect(move(board, 4, 'down')).toBe(7);
    expect(move(board, 4, 'left')).toBe(3);
    expect(move(board, 4, 'right')).toBe(5);
  });

  it('returns -1 at the edge so the page can scroll', () => {
    expect(move(board, 0, 'up')).toBe(-1);
    expect(move(board, 0, 'left')).toBe(-1);
    expect(move(board, 8, 'down')).toBe(-1);
    expect(move(board, 8, 'right')).toBe(-1);
  });

  it('does not wrap to the next row', () => {
    expect(move(board, 2, 'right')).toBe(-1);
    expect(move(board, 3, 'left')).toBe(-1);
  });

  it('stays in the same column when bounding boxes overlap from a tilt', () => {
    // Each box grows by 3px on every side, so neighbours overlap by 6px
    const tilted = layout(3, 3, 100, 0, 3);
    expect(move(tilted, 0, 'down')).toBe(3);
    expect(move(tilted, 4, 'right')).toBe(5);
    expect(move(tilted, 8, 'up')).toBe(5);
    expect(move(tilted, 8, 'left')).toBe(7);
  });

  it('works across gaps on the 5-column sheet', () => {
    const sheet = layout(7, 5, 60, 16);
    expect(move(sheet, 7, 'down')).toBe(12);
    expect(move(sheet, 7, 'up')).toBe(2);
    expect(move(sheet, 34, 'up')).toBe(29);
    expect(move(sheet, 30, 'left')).toBe(-1);
  });

  it('falls back to the nearest, best-aligned item when nothing shares the row', () => {
    const current: Box = { left: 0, right: 100, top: 0, bottom: 100 };
    const far: Box = { left: 110, right: 210, top: 300, bottom: 400 };
    const near: Box = { left: 110, right: 210, top: 120, bottom: 220 };
    expect(pickSpatialCandidate(current, [far, near], 'right')).toBe(1);
  });
});
