'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { GRID_COUNT } from '@/lib/game';

interface NewSheetDialogProps {
  completedCount: number;
  inProgressCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** True when a pointer event landed outside the dialog's box, i.e. on its ::backdrop. */
function isOutside(e: React.PointerEvent<HTMLDialogElement>): boolean {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

/**
 * Confirmation before wiping a sheet that has active or finished grids.
 *
 * A native modal <dialog>: the browser makes the page inert, keeps focus
 * inside, closes on Esc or the back gesture, and returns focus to "New Sheet".
 * Every way of closing ends in the `close` event; the button that closed it
 * (if any) is in `returnValue`.
 */
export function NewSheetDialog({
  completedCount,
  inProgressCount,
  onCancel,
  onConfirm,
}: NewSheetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const pressedOutsideRef = useRef(false);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // Start on the safe choice
    keepRef.current?.focus();
  }, []);

  const handleClose = () => {
    const dialog = dialogRef.current;
    const choice = dialog?.returnValue ?? '';
    if (dialog) dialog.returnValue = '';
    if (choice === 'confirm') onConfirm();
    else onCancel();
  };

  // Click-outside for browsers without `closedby` (Safari). Both the press and
  // the release must be outside, so a drag that ends on the backdrop does not close it.
  const supportsClosedBy =
    typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;
  const fallbackLightDismiss = supportsClosedBy
    ? {}
    : {
        onPointerDown: (e: React.PointerEvent<HTMLDialogElement>) => {
          pressedOutsideRef.current = isOutside(e);
        },
        onPointerUp: (e: React.PointerEvent<HTMLDialogElement>) => {
          if (pressedOutsideRef.current && isOutside(e)) e.currentTarget.close();
        },
      };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      role="alertdialog"
      aria-labelledby="new-sheet-confirm-title"
      aria-describedby="new-sheet-confirm-desc"
      onClose={handleClose}
      {...fallbackLightDismiss}
      className="paper-sheet paper-dots m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-[#cfc6b6] p-5 text-[#24201b] shadow-[0_20px_50px_rgba(35,28,20,0.3)] backdrop:bg-[#2d2822]/35 backdrop:backdrop-blur-[2px] sm:p-6"
    >
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
        <form method="dialog" className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            ref={keepRef}
            value="cancel"
            className="cursor-pointer rounded-full border border-[#c7beae] bg-[#f8f5ec] px-4 py-1.5 text-sm font-medium text-[#3b352c] transition hover:border-[#8f8574] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/50 sm:text-base"
          >
            Keep this sheet
          </button>
          <button
            value="confirm"
            className="cursor-pointer rounded-full border border-[#b3342b] bg-[#b3342b] px-4 py-1.5 text-sm font-medium text-[#faf7f0] shadow-xs transition hover:bg-[#9c2b23] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2b4a]/50 sm:text-base"
          >
            Start new sheet
          </button>
        </form>
      </div>
    </dialog>
  );
}
