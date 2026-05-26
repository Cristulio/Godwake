# Godwake — Claude notes

Godwake is a browser-based D&D 5e roguelite. Full design pillars, BG2 rename
map, and design-decision log are in the auto-memory directory referenced from
`.claude/settings.local.json` (`autoMemoryDirectory`). All worktrees share
that memory.

## Parallel worktree workflow

This project is set up for parallel feature work via git worktrees. You can
run multiple Claude sessions simultaneously — each on its own branch, each in
its own working directory.

### Creating a worktree

From the main repo:

```
scripts/wt-new <feature-name>            # create only
scripts/wt-new <feature-name> --launch   # create + open a new Terminal with claude
```

`--launch` is macOS-only (uses `osascript` to open Terminal.app). Without
the flag, just open a fresh terminal in the worktree manually,
`npm install`, then `claude`.

The worktree is created at `../DD-worktrees/<feature-name>` on branch
`feat/<feature-name>`. `.claude/settings.local.json` is copied so the new
session inherits permissions + the shared memory pointer.

### Cleaning up after merge

```
scripts/wt-clean <feature-name>
```

Removes the worktree directory. Branch is preserved — delete with
`git branch -d feat/<name>` (or `-D` for unmerged force-delete).

## Branching rules

- `main` is the deploy branch. Cloudflare Pages auto-deploys it.
- Feature work goes on `feat/<name>`. Cloudflare Pages auto-builds preview
  deployments for non-main branches, so each worktree gets its own URL while
  it's open.
- Don't push directly to `main` from a feature worktree. Open a PR via
  `gh pr create`.
- When merging back, prefer squash-merges to keep `main` history readable.

## Coordination rules for parallel agents

If you're a Claude session running inside a worktree:

1. **Check your branch first.** `git branch --show-current` tells you which
   feature this worktree is for. Stay in scope.
2. **Don't touch files outside the feature's scope.** Other worktrees may be
   editing shared mechanics. If you need to change shared code (combat
   engine, dice, state shapes), do it on a separate worktree or on `main`
   first, then rebase feature worktrees onto the updated `main`.
3. **Pull `main` regularly** to stay current:
   ```
   git fetch origin
   git rebase origin/main
   ```
4. **Push to your feature branch, never to `main`.**
5. **Don't `git worktree remove` a sibling worktree** another Claude session
   may be using it.

## Memory & context

The auto-memory directory is set at the user level (in
`.claude/settings.local.json`) to point to the main project's memory path.
Every worktree of this repo writes to and reads from the same directory, so
context built up by one Claude session is immediately available to the others.

If you're in a fresh worktree and don't see the project pillars, check that
`.claude/settings.local.json` was copied by `scripts/wt-new`. If you need to
fix it manually, set:

```json
"autoMemoryDirectory": "~/.claude/projects/-Users-carlosquevedo-Desktop-Claudio-DD/memory/"
```

## Stack reference (so you don't have to grep)

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 (no postcss config; the vite plugin handles it)
- Zustand for state (persisted via `zustand/middleware`)
- Pixi.js available but most visuals are inline SVG
- Zod for content schemas
- Vitest for tests
- Deployed to Cloudflare Pages

## Commit author

Local repo git config is set to `Cristulio` / `ozzyquev@hotmail.com`. No env-var
prefixes needed on commits anymore — just `git commit -m "..."`.
