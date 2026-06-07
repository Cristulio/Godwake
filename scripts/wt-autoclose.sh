#!/usr/bin/env bash
# Stop hook for autonomous worktree lanes launched by scripts/wt-new.
#
# When a fan-out lane has opened its PR, this closes its own iTerm2 pane so
# finished sessions tidy themselves up instead of piling up empty.
#
# No-op unless WT_AUTOCLOSE=1 (exported only by wt-new's launch command), so
# the orchestrator's own session and any manually-opened worktree are never
# touched. Also no-op until the lane's PR exists, so a session that stopped
# early (error, question) stays open for inspection.

[ "${WT_AUTOCLOSE:-}" = "1" ] || exit 0

sid="${ITERM_SESSION_ID:-}"
[ -n "$sid" ] || exit 0
uuid="${sid#*:}"

# Prefer the branch wt-new exported (survives a deleted cwd); fall back to git.
branch="${WT_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)}"
[ -n "$branch" ] || exit 0

# Close once the lane's work has landed — an OPEN pr (not yet merged) OR a
# MERGED one (the orchestrator merges fast, often before this Stop hook runs, so
# checking only --state open left finished panes piling up). A lane that stopped
# early with no PR, or a PR closed-without-merge, is left open for inspection.
pr="$(gh pr list --head "$branch" --state all --json number,state \
  --jq '[.[] | select(.state=="OPEN" or .state=="MERGED")][0].number' 2>/dev/null || true)"
[ -n "$pr" ] || exit 0

# Let the final response linger a beat, then close this pane. Detached so the
# close lands even as iTerm tears the session (and this hook) down.
{
  sleep 3
  osascript <<OSA >/dev/null 2>&1
tell application "iTerm"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if (id of s) is "$uuid" then
          close s
        end if
      end repeat
    end repeat
  end repeat
end tell
OSA
} >/dev/null 2>&1 &

exit 0
