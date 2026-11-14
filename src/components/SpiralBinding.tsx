import React from 'react';

const COIL_COUNT = 24;

/**
 * Twin-loop metallic spiral binding on the right edge of the notebook page,
 * inspired by the punched dot-grid notebook in the reference photo.
 */
export function SpiralBinding() {
  return (
    <div
      className="pointer-events-none absolute top-3 right-0 bottom-3 z-20 flex w-7 flex-col justify-between sm:w-9"
      aria-hidden="true"
    >
      {Array.from({ length: COIL_COUNT }).map((_, i) => (
        <div key={i} className="relative flex h-3.5 items-center justify-end sm:h-4">
          {/* Punched square hole in paper */}
          <div className="mr-3.5 h-2.5 w-2.5 rounded-[2px] bg-[#5c554c]/75 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.45)] sm:mr-4 sm:h-3 sm:w-3" />

          {/* Twin-wire metallic loop curving out past the right edge */}
          <div className="absolute right-[-7px] flex flex-col gap-[2px] sm:right-[-9px]">
            <div className="h-[3.5px] w-6 rounded-full bg-gradient-to-b from-[#d8dadf] via-[#7c8089] to-[#34373e] shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:h-[4px] sm:w-7" />
            <div className="h-[3.5px] w-6 rounded-full bg-gradient-to-b from-[#e4e6eb] via-[#8b9099] to-[#3a3d45] shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:h-[4px] sm:w-7" />
          </div>
        </div>
      ))}
    </div>
  );
}
