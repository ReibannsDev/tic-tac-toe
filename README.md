# Paper Tic-Tac-Toe

A two-player tic-tac-toe game drawn on a dotted notebook sheet: a page of hand-drawn grids, ink marks that draw themselves with real pen sounds, and a running scoreboard.

**Live app:** https://tic-tac-toe-ivory-alpha-45.vercel.app

## How to play

1. Tap any grid on the sheet to zoom in on it. With a keyboard, Tab to the sheet, use the arrow keys to pick a grid and press Enter.
2. Players take turns placing **X** and **O** (by tapping, with arrow keys and Enter, or with keys 1–9 from top left to bottom right). The banner shows whose turn it is, then who won or that it's a draw.
3. When a round ends, choose **Next empty grid →** to start a new game, or go back to the sheet.
4. **New Sheet** clears every grid for a fresh start. The scoreboard keeps counting wins and draws until you press **Reset score**. Tap the pencil next to a player to write their name.
5. The sheet follows your device's light or dark setting. Tap **Day** / **Night** to switch; picking the same look as your device goes back to following it.

Who starts alternates after every finished round, so neither player always gets the first move. Everything is saved in your browser, so a reload picks up where you left off.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) and React 19
- TypeScript, Tailwind CSS v4
- Web Audio API for the pen sounds, Web Animations API for the zoom in/out
- Vitest for the game logic tests
- Deployed on Vercel

## Running locally

```bash
bun install
bun run dev        # http://localhost:3000
```

npm works too (`npm install`, `npm run dev`).

| Script | What it does |
| --- | --- |
| `dev` | Start the dev server |
| `build` / `start` | Production build and server |
| `test` | Run the Vitest suite |
| `lint` / `typecheck` | ESLint and `tsc --noEmit` |

## Project structure

```
src/
  app/                    layout, page, favicon and share image
  components/
    NotebookGame.tsx      the sheet: header, page of boards, dialogs
    FocusedGridOverlay.tsx  zoomed-in playable board (native <dialog>, FLIP animation)
    TicTacToeBoard.tsx    one board, mini or focused
    HandMark.tsx          hand-drawn X / O
    ScoreBoard.tsx        sticky score, progress and next starter
    NewSheetDialog.tsx    "start a fresh sheet?" confirmation
  lib/
    game.ts               pure rules: moves, winner, draw, turn order
    notebookStore.ts      app state + localStorage persistence (useSyncExternalStore)
    handdrawn.ts          seeded random SVG paths so every grid looks hand-drawn
    sound.ts              pen samples and UI sounds
    spatialNav.ts         picks the arrow-key target from on-screen positions
    useRovingGrid.ts      one Tab stop per grid, arrow keys between items
```

## Design decisions

- **Game rules are pure functions.** `game.ts` has no React in it, so the rules are tested directly (`game.test.ts`). The store calls `applyMove` once per move and the UI reacts to its result (win, draw, continue).
- **Saved data is validated.** Winner, winning line and draw are re-derived from each saved board instead of trusted, and anything malformed falls back to a fresh sheet instead of crashing.
- **Hand-drawn look is deterministic.** Each grid and mark uses a seeded random generator, so the wobble is unique per grid but identical between server and client renders (no hydration mismatch).
- **Accessible.** Grids and cells are real buttons with descriptive labels. The sheet and the board are each a single Tab stop with arrow keys between items, and 1–9 play a cell in reading order. Both overlays are native modal `<dialog>`s, so the page behind is inert and doesn't scroll, focus stays inside, and Esc closes them. Turn and result changes are announced to screen readers, and animations respect `prefers-reduced-motion`.

## Built with AI

This project was built with AI coding tools (Claude Code) as a pair programmer: generating the hand-drawn SVG approach, iterating on animations and sound, auditing the code, and writing tests. I reviewed and directed every change.

## Credits

- Pen sounds are cut from "pen write" by freesound_community on Pixabay (Pixabay Content License).
- Fonts: [Caveat](https://fonts.google.com/specimen/Caveat) and [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) via Google Fonts.
