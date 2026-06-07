# Godwake — Claude notes

Godwake is a browser-based D&D 5e roguelite. Full design pillars, BG2 rename
map, and design-decision log are in the auto-memory directory referenced from
`.claude/settings.local.json` (`autoMemoryDirectory`). All worktrees share
that memory.

## GSD — spec-driven development

We work spec-first: for anything non-trivial a short written spec is
approved **before** code is written. The spec is the review gate — it's
where direction and taste get applied. The user is non-technical and
reviews intent in plain language, not diffs, so approving the spec (not
the diff) is the green light to dispatch lanes. Scaffold one with
`/spec <description>` (an orchestrator-side command).

### When to spec (tiered — don't over-ceremony)

The orchestrator proposes the tier; when in doubt, or when shared
mechanics / multiple files are in play, default to **full**.

- **Full spec** — new feature, new system, new content (chapter / class
  / boss / event), or any change spanning multiple files or shared
  mechanics (combat engine, dice, state shapes). Spec → plan → tasks.
- **Lite** — one paragraph, no spec file: bug fix, copy, a single-file
  tweak, one balance number. State intent + how it's validated, then go.
  Lite skips the written spec, **never** the verification bar. A
  three-line change never gets a three-page spec.
- **Balance is sim-specced, not hand-specced.** For tuning, the "spec"
  is the target band + the sim that measures it; validation is the sim
  run, never hand-picked numbers. (See the sim-driven balance memories.)

### Spec shape (plain language first)

A full spec answers, in order:

1. **Goal** — what the player experiences and why, in in-world / player
   terms, not code terms. This is the part the user signs off on.
2. **Plan** — the technical approach: which files/systems, data vs
   engine, any shared-code touch that needs sequencing first.
3. **Tasks** — the breakdown, grouped into file-disjoint lanes so they
   can fan out in parallel without colliding.
4. **Done means** — the bar: `npm run build` green, tests green,
   sim-in-band (for balance), and the playtest check the user will run.

### Where specs live + lifecycle

- A spec is a memory file (`type: project`) in the shared auto-memory
  dir — **not** in the repo. Why there: it's live-shared across every
  worktree the instant it's written (no commit / branch / rebase before
  a lane can read it), and the user reviews it in chat, not in a PR diff.
  Add a MEMORY.md pointer like any other memory.
- This file **is** the lane record — don't also write a separate
  after-the-fact one. It begins as the spec and ends as the outcome.
- **Status**, tracked in the file: `DRAFT` → `APPROVED` (user signed off
  the Goal) → `BUILDING` (lanes dispatched) → `MERGED` (PR landed,
  Outcome filled). Abandoned specs are **deleted**, not left as stale
  DRAFTs.

### How GSD rides the existing loop

Plan → brief → dispatch → verify already *is* this loop. GSD only makes
the "brief" a written, user-approved artifact instead of an ad-hoc
message, and moves the approval gate to the spec (where the non-technical
user has leverage) instead of the diff (which the user doesn't read).
Merge stays on green; fan-out stays file-disjoint; balance stays
sim-driven. Trivial changes skip the gate so iteration stays fast.

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
- **Push and merge when ready — don't ask each time** (user grant,
  2026-06-07; overrides the global "confirm before push" rule for this
  project). Use judgment: ship once `npm run build` + tests are green and
  the change is in scope. Covers `git push` (incl. to `main` in the main
  repo), opening PRs, and `gh pr merge --squash --delete-branch` of the
  just-merged branch. Still **confirm first**: `--force` /
  `--force-with-lease`, `reset --hard`, deleting branches or worktrees you
  didn't just create, and anything outside the normal ship flow.

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
