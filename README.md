# Godwake

A browser-based D&D 5e roguelite. 8-bit dark with a warm palette, BG2-inspired
setting, solo single-character delves, automated rules. Hobby project, free
to play, no microtransactions.

## What it is

You die. The Druid Grove reincarnates you (D&D's Reincarnate spell, RAW).
Each life rolls new Quirks. You delve again. Your soul carries memory across
incarnations; your body does not. Build Renown over many runs, push deeper
into the Mage's Cells, Athkatla, Spellhold, the Underdark, the Crucible.

Inspirations: Hades (death loop), Darkest Dungeon (run-based, dark tone),
Loop Hero (8-bit), Slay the Spire (info-dense UI), D&D Beyond (full rule
transparency).

## Status

Pre-MVP. Scaffold + dice engine. Building toward Chapter 1 vertical slice.

## Tech

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4
- Zustand for state
- Pixi.js for sprite animation, dice rolls, particles
- Zod for content schema validation
- Vitest for unit tests

## Running

```bash
npm install
npm run dev        # dev server
npm run test       # watch tests
npm run test:run   # one-shot tests
npm run build      # type-check + production build
```

## Deployment

Cloudflare Pages. Static SPA, no backend at v1 (saves in localStorage).
Free tier covers the project indefinitely at hobby scale.

## License

To be decided. Code is private by default until then.
