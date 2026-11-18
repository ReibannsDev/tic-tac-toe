'use client';

import { useCallback, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { KEY_TO_DIRECTION, pickSpatialCandidate } from './spatialNav';

/** Attribute that marks an arrow-key target and carries its index. */
export const ROVING_ATTR = 'data-roving-index';

function readIndex(el: EventTarget | null): number | null {
  if (!(el instanceof HTMLElement)) return null;
  const raw = el.getAttribute(ROVING_ATTR);
  return raw === null ? null : Number(raw);
}

/**
 * Roving tabindex for a role="grid": the grid is a single Tab stop and the
 * arrow keys move between items (marked with `data-roving-index`) by their
 * position on screen. At an edge the key is left alone so the page still scrolls.
 */
export function useRovingGrid(initialIndex = 0) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Clicking or tabbing to an item makes it the grid's Tab stop
  const onFocus = useCallback((e: FocusEvent<HTMLElement>) => {
    const index = readIndex(e.target);
    if (index !== null) setActiveIndex(index);
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    const direction = KEY_TO_DIRECTION[e.key];
    if (!direction || e.defaultPrevented) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

    const current = e.nativeEvent.composedPath()[0];
    if (!(current instanceof HTMLElement) || readIndex(current) === null) return;

    const candidates = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(`[${ROVING_ATTR}]`)
    ).filter((el) => el !== current && el.checkVisibility());
    const picked = pickSpatialCandidate(
      current.getBoundingClientRect(),
      candidates.map((el) => el.getBoundingClientRect()),
      direction
    );
    if (picked === -1) return;

    e.preventDefault();
    const next = candidates[picked];
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, []);

  return {
    activeIndex,
    tabIndexFor: (index: number) => (index === activeIndex ? 0 : -1),
    gridProps: { onFocus, onKeyDown },
  };
}
