'use client';

import React, { useRef, useState } from 'react';
import { GRID_COUNT, type Player, type ScoreState } from '@/lib/game';
import { MAX_NAME_LENGTH, playerLabel, setPlayerName } from '@/lib/notebookStore';
import { HandSymbolIcon, INK_COLORS } from './HandMark';

interface ScoreBoardProps {
  score: ScoreState;
  playerNames: Record<Player, string>;
  nextStarter: Player;
  completedCount: number;
  inProgressCount: number;
}

const PLAYER_TILE_STYLES: Record<Player, string> = {
  X: 'border-ink-x/25 bg-ink-x/[0.03]',
  O: 'border-ink-o/25 bg-ink-o/[0.03]',
};

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

interface PlayerTileProps {
  player: Player;
  name: string;
  wins: number;
}

/**
 * One player's score. The pencil turns the name into a text field: Enter or
 * leaving the field saves, Esc cancels, and a blank name goes back to "Player X".
 */
function PlayerTile({ player, name, wins }: PlayerTileProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // Enter/Esc finish directly, and the blur that follows must not finish again
  const finishedRef = useRef(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const label = name || `Player ${player}`;

  const startEditing = () => {
    finishedRef.current = false;
    setDraft(name);
    setEditing(true);
  };

  const finishEditing = (save: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (save) setPlayerName(player, draft);
    setEditing(false);
    // Put focus back on the pencil once it is rendered again
    requestAnimationFrame(() => editButtonRef.current?.focus({ preventScroll: true }));
  };

  return (
    // Phones: mark and score on top, name and pencil underneath. Wider: one row.
    <div
      className={`grid min-w-0 grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5 rounded-md border px-2 py-1 sm:grid-cols-[auto_1fr_auto] sm:px-3.5 sm:py-1.5 ${PLAYER_TILE_STYLES[player]}`}
    >
      <HandSymbolIcon player={player} className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
      <div className="col-span-2 row-start-2 flex min-w-0 items-center gap-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:gap-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => finishEditing(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                finishEditing(e.key === 'Enter');
              }
            }}
            aria-label={`Name for player ${player}`}
            placeholder={`Player ${player}`}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="done"
            className="w-full min-w-0 border-0 border-b border-dashed border-line bg-transparent px-0.5 py-0 text-base leading-tight text-ink placeholder:text-faint focus:border-solid focus:border-ink focus:outline-hidden"
          />
        ) : (
          <>
            <span className="truncate text-xs text-ink-soft sm:text-base" title={label}>
              {label}
            </span>
            <button
              ref={editButtonRef}
              type="button"
              onClick={startEditing}
              aria-label={`Edit name for ${label}`}
              title="Edit name"
              className="-m-1 shrink-0 cursor-pointer rounded-full p-1 text-faint transition hover:bg-ink/[0.06] hover:text-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ink-x/50"
            >
              <PencilIcon />
            </button>
          </>
        )}
      </div>
      <span
        className="col-start-2 row-start-1 justify-self-end font-[family-name:var(--font-hand-display)] text-xl leading-none font-bold sm:col-start-3 sm:text-3xl"
        style={{ color: INK_COLORS[player] }}
      >
        <span className="sr-only">{label}: </span>
        {wins}
        <span className="sr-only"> {wins === 1 ? 'win' : 'wins'}</span>
      </span>
    </div>
  );
}

/** Sticky running score (X wins, ties, O wins) plus sheet progress and the next starter. */
export function ScoreBoard({
  score,
  playerNames,
  nextStarter,
  completedCount,
  inProgressCount,
}: ScoreBoardProps) {
  return (
    <div className="paper-sheet paper-dots sticky top-2 z-30 mb-4 rounded-lg border border-dashed border-line-soft p-2 shadow-[0_4px_12px_rgba(38,31,22,0.08)] sm:mb-6 sm:p-2.5">
      {/* On phones the ties tile shrinks to fit so the player names get the room */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 sm:grid-cols-3 sm:gap-3">
        <PlayerTile player="X" name={playerNames.X} wins={score.X} />

        <div className="flex items-center justify-between gap-1.5 rounded-md border border-line/30 bg-ink/[0.02] px-2 py-1 sm:px-3.5 sm:py-1.5">
          <span className="text-sm text-muted sm:text-base">Ties</span>
          <span className="font-[family-name:var(--font-hand-display)] text-xl leading-none font-bold text-muted sm:text-3xl">
            {score.ties}
          </span>
        </div>

        <PlayerTile player="O" name={playerNames.O} wins={score.O} />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line-soft pt-1.5 text-xs text-faint sm:text-sm">
        <span>
          {completedCount}/{GRID_COUNT} finished
          {inProgressCount > 0 ? ` · ${inProgressCount} in play` : ''}
        </span>
        <div className="flex items-center gap-1.5 font-medium text-ink-soft">
          <span>Next fresh grid starts with</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-line-soft bg-paper-raised px-2 py-0.5">
            <HandSymbolIcon player={nextStarter} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sr-only">{playerLabel(playerNames, nextStarter)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
