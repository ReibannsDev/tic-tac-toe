/**
 * Deterministic PRNG + organic hand-drawn SVG path generators.
 * Every grid, X, O, and winning strike-through has its own subtle pen jitter
 * so the 35 grids on the notebook page look naturally sketched by hand.
 */

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(rand: () => number, base: number, spread: number): number {
  return +(base + (rand() - 0.5) * 2 * spread).toFixed(2);
}

export interface HandGridGeometry {
  lines: [string, string, string, string];
  tiltDeg: number;
}

/**
 * Generates 4 quadratic Bezier paths (2 vertical, 2 horizontal) in a 0..100 viewBox
 * mirroring the loose, slightly bowed pen strokes from the reference notebook photo.
 */
export function getHandGridGeometry(gridId: number, pageNumber: number = 1): HandGridGeometry {
  const rand = mulberry32((pageNumber * 1009 + gridId * 7919 + 31) >>> 0);

  // Inner grid line positions roughly around 34 and 66
  const vx1 = jitter(rand, 34, 2.8);
  const vx2 = jitter(rand, 66, 2.8);
  const hy1 = jitter(rand, 34, 2.8);
  const hy2 = jitter(rand, 66, 2.8);

  const makeVertical = (baseX: number): string => {
    const xStart = jitter(rand, baseX, 2.4);
    const yStart = jitter(rand, 7, 3.8);
    const xEnd = jitter(rand, baseX, 2.4);
    const yEnd = jitter(rand, 93, 3.8);
    const cx = jitter(rand, (xStart + xEnd) / 2, 2.6);
    const cy = jitter(rand, 50, 5);
    return `M ${xStart} ${yStart} Q ${cx} ${cy} ${xEnd} ${yEnd}`;
  };

  const makeHorizontal = (baseY: number): string => {
    const xStart = jitter(rand, 7, 3.8);
    const yStart = jitter(rand, baseY, 2.4);
    const xEnd = jitter(rand, 93, 3.8);
    const yEnd = jitter(rand, baseY, 2.4);
    const cx = jitter(rand, 50, 5);
    const cy = jitter(rand, (yStart + yEnd) / 2, 2.6);
    return `M ${xStart} ${yStart} Q ${cx} ${cy} ${xEnd} ${yEnd}`;
  };

  const tiltDeg = +((rand() - 0.5) * 3.2).toFixed(2);

  return {
    lines: [
      makeVertical(vx1),
      makeVertical(vx2),
      makeHorizontal(hy1),
      makeHorizontal(hy2),
    ],
    tiltDeg,
  };
}

/**
 * Generates two slightly curved pen strokes for an 'X' in a 0..100 cell viewBox.
 */
export function getHandXPaths(gridId: number, cellIndex: number, pageNumber: number = 1): [string, string] {
  const rand = mulberry32((pageNumber * 3571 + gridId * 997 + cellIndex * 131 + 17) >>> 0);

  // Stroke 1: top-left to bottom-right
  const x1a = jitter(rand, 23, 4);
  const y1a = jitter(rand, 22, 4);
  const x1b = jitter(rand, 78, 4);
  const y1b = jitter(rand, 78, 4);
  const c1x = jitter(rand, 50, 4);
  const c1y = jitter(rand, 50, 4);

  // Stroke 2: top-right to bottom-left
  const x2a = jitter(rand, 77, 4);
  const y2a = jitter(rand, 23, 4);
  const x2b = jitter(rand, 22, 4);
  const y2b = jitter(rand, 77, 4);
  const c2x = jitter(rand, 50, 4);
  const c2y = jitter(rand, 50, 4);

  return [
    `M ${x1a} ${y1a} Q ${c1x} ${c1y} ${x1b} ${y1b}`,
    `M ${x2a} ${y2a} Q ${c2x} ${c2y} ${x2b} ${y2b}`,
  ];
}

/**
 * Generates a natural pen-drawn 'O' loop in a 0..100 cell viewBox.
 * Uses a multi-point closed-ish smooth curve with subtle radius & join imperfection.
 */
export function getHandOPath(gridId: number, cellIndex: number, pageNumber: number = 1): string {
  const rand = mulberry32((pageNumber * 4219 + gridId * 1223 + cellIndex * 197 + 53) >>> 0);

  const cx = jitter(rand, 50, 2.5);
  const cy = jitter(rand, 50, 2.5);
  const rx = jitter(rand, 27, 2.5);
  const ry = jitter(rand, 28, 2.5);
  const startAngle = -Math.PI * 0.42 + (rand() - 0.5) * 0.35;

  const steps = 8;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    // Slightly overshoot past 2π to mimic an organic hand-drawn pen loop
    const t = i / steps;
    const angle = startAngle + t * Math.PI * 2.04;
    const wobbleR = 1 + (rand() - 0.5) * 0.14;
    pts.push({
      x: +(cx + Math.cos(angle) * rx * wobbleR).toFixed(2),
      y: +(cy + Math.sin(angle) * ry * wobbleR).toFixed(2),
    });
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const midX = +((curr.x + next.x) / 2).toFixed(2);
    const midY = +((curr.y + next.y) / 2).toFixed(2);
    if (i === 0) {
      d += ` L ${midX} ${midY}`;
    } else {
      d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
    }
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

const CELL_CENTERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 19, y: 19 },
  { x: 50, y: 19 },
  { x: 81, y: 19 },
  { x: 19, y: 50 },
  { x: 50, y: 50 },
  { x: 81, y: 50 },
  { x: 19, y: 81 },
  { x: 50, y: 81 },
  { x: 81, y: 81 },
];

/**
 * Generates a hand-drawn strike-through line across the 3 winning cells in a 0..100 grid viewBox.
 */
export function getWinStrikePath(
  line: [number, number, number],
  gridId: number,
  pageNumber: number = 1
): string {
  const rand = mulberry32((pageNumber * 6133 + gridId * 1499 + 91) >>> 0);
  const start = CELL_CENTERS[line[0]];
  const end = CELL_CENTERS[line[2]];

  // Extend slightly beyond cell centers so the strike looks decisive
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ext = 9;
  const ux = (dx / len) * ext;
  const uy = (dy / len) * ext;

  const x1 = jitter(rand, start.x - ux, 1.8);
  const y1 = jitter(rand, start.y - uy, 1.8);
  const x2 = jitter(rand, end.x + ux, 1.8);
  const y2 = jitter(rand, end.y + uy, 1.8);
  const cx = jitter(rand, (x1 + x2) / 2, 2.2);
  const cy = jitter(rand, (y1 + y2) / 2, 2.2);

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
