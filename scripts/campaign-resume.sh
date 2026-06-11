#!/bin/bash
# Campaign auto-resume: opens a new iTerm window in the main repo and resumes
# the orchestrator session against the campaign plan memory. Fired by the
# com.godwake.campaign-resume.* LaunchAgents (04:30 / 10:00) while the
# 2026-06-11 campaign runs. Remove the agents when the campaign completes:
#   launchctl bootout gui/$(id -u)/com.godwake.campaign-resume.0430
#   launchctl bootout gui/$(id -u)/com.godwake.campaign-resume.1000
#   rm ~/Library/LaunchAgents/com.godwake.campaign-resume.*.plist
SESSION_ID="ed1f0161-e470-4173-a11b-99e697da1136"
PROMPT="Tokens refreshed — resume the campaign. Read the campaign-2026-06-11-plan memory FIRST, check every lane pane/PR state (lanes likely died at token exhaustion — relaunch dead ones with their briefs, fable max), then continue the plan in order. Update the plan file as things land."
/usr/bin/osascript <<APPLESCRIPT
tell application "iTerm2"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    write text ""
    delay 2
    write text "claude --resume $SESSION_ID --dangerously-skip-permissions"
    delay 12
    write text ""
    delay 3
    write text "$PROMPT"
  end tell
end tell
APPLESCRIPT
