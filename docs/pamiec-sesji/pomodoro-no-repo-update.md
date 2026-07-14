---
name: pomodoro-no-repo-update
description: Never push/update the POMODORO repo without explicit consent — distribution needs a virus scan first
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6e94c524-d3b7-43ef-a223-4381989b21bc
---

For the POMODORO project (`pomodoro-overlay` / `mojepomodoro`), NEVER commit/push/update the repo without the user's explicit consent.

**Why:** The released binary/files must be virus-scanned before distribution (VirusTotal etc.); pushing untested changes to the repo would skip that gate.

**How to apply:** Edit local files freely to fix bugs, but stop and ask before any `git commit`/`git push` or any action that updates the remote/release. Wait for explicit go-ahead each time.
