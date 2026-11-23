import { STORAGE_KEY } from './storageKey';

/** 'system' follows the device's light/dark setting; the others pin a theme. */
export type ThemePreference = 'system' | 'day' | 'night';

export const isThemePreference = (v: unknown): v is ThemePreference =>
  v === 'system' || v === 'day' || v === 'night';

/**
 * Runs in <head> before first paint: copies a saved Day/Night choice onto
 * <html data-theme> so the page never flashes the wrong theme. 'system' needs
 * nothing, because the CSS follows prefers-color-scheme on its own.
 * Kept free of React imports so the server layout can use it.
 */
export const THEME_BOOT_SCRIPT = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})||'{}').theme;if(t==='day'||t==='night')document.documentElement.dataset.theme=t}catch(e){}`;

/** Applies a preference to <html>, removing the attribute for 'system'. */
export function applyThemePreference(theme: ThemePreference): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
