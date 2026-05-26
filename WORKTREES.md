# Parallel worktrees for Godwake

This project is set up so you can run multiple Claude sessions in parallel,
each on a different feature, without thrashing the main checkout.

## Layout

```
~/Desktop/Claudio/
├── DD/                              ← main repo (this checkout, on main)
└── DD-worktrees/                    ← sibling directory, holds feature worktrees
    ├── quirks-expansion/            ← worktree on feat/quirks-expansion
    ├── bg2-imoen-rescue/            ← worktree on feat/bg2-imoen-rescue
    └── chapter-2-prologue/          ← worktree on feat/chapter-2-prologue
```

Each worktree is a real, full checkout of the repo on its own branch — its
own `node_modules`, its own build artifacts, its own running dev server. The
git database is shared, so commits and branches you make in one are visible
from any of them.

## Quick reference

| Action | Command |
|---|---|
| Create a feature worktree | `scripts/wt-new feature-name` |
| List worktrees | `git worktree list` |
| Remove a finished worktree | `scripts/wt-clean feature-name` |
| Delete the branch after merge | `git branch -d feat/feature-name` |

## Typical flow

1. **Pick a feature.** Decide what you're working on. Use a short kebab-case
   slug (e.g. `wizard-class`, `chapter-2-teaser`).

2. **Create the worktree.**
   ```
   scripts/wt-new wizard-class
   ```
   This creates the worktree directory and a `feat/wizard-class` branch off
   `main`. It also copies `.claude/settings.local.json` so the new Claude
   session inherits permissions + the shared memory pointer.

3. **Open it in a new terminal.**
   ```
   cd ../DD-worktrees/wizard-class
   npm install
   claude
   ```
   The new Claude session has no idea what the main session is doing — but
   it shares the project memory, so it can read the design pillars, the
   BG2 rename map, etc.

4. **Work and commit.** Push to `feat/wizard-class` whenever. Cloudflare
   Pages auto-builds a preview deploy for every non-main branch, so you'll
   get a URL like `wizard-class.godwake.pages.dev` to test.

5. **Open a PR when ready.**
   ```
   gh pr create --base main --head feat/wizard-class
   ```

6. **Merge via GitHub UI** (squash recommended).

7. **Clean up.**
   ```
   # Back in the main repo
   scripts/wt-clean wizard-class
   git branch -d feat/wizard-class
   git pull
   ```

## Coordination rules (when running multiple agents)

- **One feature per worktree.** Don't have two worktrees fighting over the
  same files.
- **Shared mechanics changes go to main first.** If feature A and feature B
  both need a tweak to the combat engine, do that tweak on main (or a tiny
  separate worktree), merge, then rebase A and B onto the updated main.
- **Rebase before pushing.** `git fetch && git rebase origin/main` keeps
  your feature branches mergeable.
- **Don't share `node_modules`.** Just run `npm install` per worktree. It's
  slow once and harmless after.

## Cloudflare Pages preview deploys

By default Cloudflare Pages builds previews for any non-main branch you
push to GitHub. Each `feat/<name>` push gets its own URL — useful for
sharing in-progress work or testing on real devices.

If you push a lot, watch your build minutes — Cloudflare's free tier gives
you 500 builds/month, which is plenty for normal work but can be eaten
quickly by aggressive WIP pushes.

## Memory across worktrees

All worktrees share the same auto-memory directory (set via
`autoMemoryDirectory` in `.claude/settings.local.json`). Whatever one
Claude session learns and saves, the others can read. Design decisions,
character names, rename maps — all visible everywhere.

This means: **if you change a design decision in one worktree, save it to
memory.** Other worktrees will pick it up immediately without coordination.

## Alternative: spawn worker agents

If you don't want to manage multiple terminals, you can also have a single
Claude session spawn worker agents in isolated worktrees via the `Agent`
tool's `isolation: "worktree"` mode. That's good for short, scoped tasks
("write the wizard class data file") but worse for sustained collaboration
where you want to give live feedback.

Use multiple Claude sessions when:
- You're actively iterating on multiple features
- Each feature is a multi-hour effort
- You want preview deploys per branch

Use worker agents when:
- You have a well-scoped task you can delegate
- You don't need to interact mid-task
- You'd rather not open another terminal
