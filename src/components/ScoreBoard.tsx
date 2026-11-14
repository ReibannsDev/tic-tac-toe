import React from 'react';
import { GRID_COUNT, type Player, type ScoreState } from '@/lib/game';
import { HandSymbolIcon, INK_COLORS } from './HandMark';

interface ScoreBoardProps {
  score: ScoreState;
  nextStarter: Player;
  completedCount: number;
  inProgressCount: number;
}

const PLAYER_TILE_STYLES: Record<Player, string> = {
  X: 'border-[#1c2b4a]/25 bg-[#1c2b4a]/[0.03]',
  O: 'border-[#b3342b]/25 bg-[#b3342b]/[0.03]',
};

function PlayerTile({ player, wins }: { player: Player; wins: number }) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-2.5 py-1 sm:px-3.5 sm:py-1.5 ${PLAYER_TILE_STYLES[player]}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <HandSymbolIcon player={player} className="h-5 w-5 shrink-0" />
        {/* On phones the hand-drawn symbol alone identifies the player */}
        <span className="sr-only text-[#3c362e] sm:not-sr-only sm:text-base">Player {player}</span>
      </div>
      <span
        className="font-[family-name:var(--font-hand-display)] text-xl leading-none font-bold sm:text-3xl"
        style={{ color: INK_COLORS[player] }}
      >
        {wins}
      </span>
    </div>
  );
}

/** Sticky running score (X wins, ties, O wins) plus sheet progress and the next starter. */
export function ScoreBoard({ score, nextStarter, completedCount, inProgressCount }: ScoreBoardProps) {
  return (
    <div className="paper-sheet paper-dots sticky top-2 z-30 mb-4 rounded-lg border border-dashed border-[#c7beae] p-2 shadow-[0_4px_12px_rgba(38,31,22,0.08)] sm:mb-6 sm:p-2.5">
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        <PlayerTile player="X" wins={score.X} />

        <div className="flex items-center justify-between rounded-md border border-[#8d8476]/30 bg-[#24201b]/[0.02] px-2.5 py-1 sm:px-3.5 sm:py-1.5">
          <span className="text-sm text-[#5d5549] sm:text-base">Ties</span>
          <span className="font-[family-name:var(--font-hand-display)] text-xl leading-none font-bold text-[#5d5549] sm:text-3xl">
            {score.ties}
          </span>
        </div>

        <PlayerTile player="O" wins={score.O} />
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
            <span className="sr-only">Player {nextStarter}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
