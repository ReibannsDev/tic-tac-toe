'use client';

import React, { useEffect, useRef } from 'react';
import { GRID_COUNT } from '@/lib/game';
import { useFocusTrap } from '@/lib/useFocusTrap';

interface NewSheetDialogProps {
  completedCount: number;
  inProgressCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation before wiping a sheet that has active or finished grids. */
export function NewSheetDialog({
  completedCount,
  inProgressCount,
  onCancel,
  onConfirm,
}: NewSheetDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="new-sheet-confirm-title"
      aria-describedby="new-sheet-confirm-desc"
    >
      <div onClick={onCancel} className="absolute inset-0 bg-[#2d2822]/35 backdrop-blur-[2px]" />
      <div className="paper-sheet paper-dots relative z-10 w-full max-w-sm rounded-xl border border-[#cfc6b6] p-5 shadow-[0_20px_50px_rgba(35,28,20,0.3)] sm:p-6">
        <div className="rounded-lg border border-dashed border-[#c7beae] bg-[#faf7f0]/75 p-4">
          <h2
            id="new-sheet-confirm-title"
            className="font-[family-name:var(--font-hand-display)] text-2xl font-bold text-[#24201b]"
          >
            Start a fresh sheet?
          </h2>
          <p
            id="new-sheet-confirm-desc"
            className="mt-2 text-sm leading-relaxed text-[#574f43] sm:text-base"
          >
            This will clear all {GRID_COUNT} grids on the current sheet ({completedCount} finished
            {inProgressCount > 0 ? `, ${inProgressCount} in play` : ''}). Your scoreboard will stay
            intact.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              data-autofocus
              className="cursor-pointer rounded-full border border-[#c7beae] bg-[#f8f5ec] px-4 py-1.5 text-sm font-medium text-[#3b352c] transition hover:border-[#8f8574] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/50 sm:text-base"
            >
              Keep this sheet
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="cursor-pointer rounded-full border border-[#b3342b] bg-[#b3342b] px-4 py-1.5 text-sm font-medium text-[#faf7f0] shadow-xs transition hover:bg-[#9c2b23] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/50 sm:text-base"
            >
              Start new sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
