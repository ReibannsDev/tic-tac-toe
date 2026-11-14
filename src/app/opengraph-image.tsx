import { ImageResponse } from 'next/og';

export const alt = 'Paper Tic-Tac-Toe: a dotted notebook sheet of hand-drawn tic-tac-toe grids';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = { X: '#1c2b4a', O: '#b3342b', grid: '#24201b' };

// A few finished mini-games to fill the sheet
const BOARDS: ('X' | 'O' | null)[][] = [
  ['X', 'O', 'X', null, 'X', 'O', 'O', null, 'X'],
  ['O', 'X', null, 'X', 'O', null, 'X', null, 'O'],
  [null, 'X', null, 'O', 'X', null, null, 'X', 'O'],
  ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'],
  [null, null, null, null, 'X', null, null, null, null],
];

// Satori only accepts intrinsic elements inside <svg>, so this is a plain function, not a component
function renderMark(key: number, value: 'X' | 'O', x: number, y: number) {
  return value === 'X' ? (
    <path
      key={key}
      d={`M ${x - 9} ${y - 9} L ${x + 9} ${y + 9} M ${x + 9} ${y - 9} L ${x - 9} ${y + 9}`}
      stroke={INK.X}
      strokeWidth={5}
      strokeLinecap="round"
      fill="none"
    />
  ) : (
    <circle key={key} cx={x} cy={y} r={10} stroke={INK.O} strokeWidth={5} fill="none" />
  );
}

function MiniBoard({ board }: { board: ('X' | 'O' | null)[] }) {
  return (
    <svg width="150" height="150" viewBox="0 0 100 100">
      <path
        d="M 35 6 Q 34 50 36 94 M 66 7 Q 67 50 65 93 M 6 35 Q 50 33 94 36 M 7 66 Q 50 67 93 65"
        stroke={INK.grid}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        opacity={0.88}
      />
      {board.map((cell, i) =>
        cell ? renderMark(i, cell, 19 + (i % 3) * 31, 19 + Math.floor(i / 3) * 31) : null
      )}
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '70px 90px',
          backgroundColor: '#f4f0e6',
          backgroundImage: 'radial-gradient(circle, #bfb7a6 2px, transparent 2.5px)',
          backgroundSize: '28px 28px',
          color: INK.grid,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -1 }}>Tic-Tac-Toe</div>
        <div style={{ fontSize: 36, color: '#574f43', marginTop: 12 }}>
          35 hand-drawn grids on a notebook sheet
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 60 }}>
          {BOARDS.map((board, i) => (
            <MiniBoard key={i} board={board} />
          ))}
        </div>
      </div>
    ),
    size
  );
}
