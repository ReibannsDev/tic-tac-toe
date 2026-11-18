/**
 * Arrow-key navigation picked from what is on screen, not from DOM order.
 * The rule is pure (rectangles in, index out) so it is tested without a browser.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export const KEY_TO_DIRECTION: Readonly<Record<string, Direction | undefined>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Weight on misalignment when no candidate shares a row or column with the current one. */
const MISALIGNMENT_WEIGHT = 2;

/**
 * Returns the index of the candidate to move to from `current` in `direction`,
 * or -1 when there is none (the caller then leaves the key to the browser, so
 * the page can still scroll).
 *
 * A candidate counts only if its near edge is at or past the current box's far
 * edge. Candidates that share the current row (left/right) or column (up/down)
 * win, nearest first; otherwise the nearest, best-aligned one does.
 */
export function pickSpatialCandidate(
  current: Box,
  candidates: readonly Box[],
  direction: Direction
): number {
  const horizontal = direction === 'left' || direction === 'right';
  const size = horizontal ? current.right - current.left : current.bottom - current.top;
  // Boards are tilted by up to ~1.6deg, so neighbouring bounding boxes overlap
  // by a few pixels. A quarter of the item's size absorbs that (and sub-pixel
  // rounding) while still keeping an item's own row/column out.
  const tolerance = Math.max(1, size * 0.25);
  const centerX = (b: Box) => (b.left + b.right) / 2;
  const centerY = (b: Box) => (b.top + b.bottom) / 2;

  const aligned: { index: number; gap: number; offset: number }[] = [];
  let fallbackIndex = -1;
  let fallbackScore = Infinity;

  candidates.forEach((c, index) => {
    let gap: number;
    switch (direction) {
      case 'right':
        if (c.left < current.right - tolerance) return;
        gap = c.left - current.right;
        break;
      case 'left':
        if (c.right > current.left + tolerance) return;
        gap = current.left - c.right;
        break;
      case 'down':
        if (c.top < current.bottom - tolerance) return;
        gap = c.top - current.bottom;
        break;
      case 'up':
        if (c.bottom > current.top + tolerance) return;
        gap = current.top - c.bottom;
        break;
    }
    gap = Math.max(0, gap);

    const overlaps = horizontal
      ? c.top < current.bottom && c.bottom > current.top
      : c.left < current.right && c.right > current.left;
    const offset = horizontal
      ? Math.abs(centerY(c) - centerY(current))
      : Math.abs(centerX(c) - centerX(current));

    if (overlaps) {
      aligned.push({ index, gap, offset });
      return;
    }
    const score = gap + MISALIGNMENT_WEIGHT * offset;
    if (score < fallbackScore) {
      fallbackScore = score;
      fallbackIndex = index;
    }
  });

  if (aligned.length === 0) return fallbackIndex;

  // Nearest aligned gap first; gaps within the tolerance count as a tie and the
  // best-centred one wins (tilted neighbours can sit a pixel or two closer).
  const minGap = Math.min(...aligned.map((a) => a.gap));
  let best = aligned[0];
  for (const a of aligned) {
    if (a.gap > minGap + tolerance) continue;
    if (best.gap > minGap + tolerance || a.offset < best.offset) best = a;
  }
  return best.index;
}
