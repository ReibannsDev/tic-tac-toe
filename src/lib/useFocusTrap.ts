'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  /** Return focus to whatever was focused before the trap opened. Default true. */
  restoreFocus?: boolean;
}

/**
 * Moves focus into a modal container on mount, keeps Tab / Shift+Tab inside it,
 * and (optionally) restores the previous focus on unmount.
 *
 * Initial focus goes to the first `[data-autofocus]` descendant, or to the
 * container itself (give it `tabIndex={-1}`).
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { restoreFocus = true }: FocusTrapOptions = {}
): void {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial = container.querySelector<HTMLElement>('[data-autofocus]') ?? container;
    initial.focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [ref, restoreFocus]);
}
