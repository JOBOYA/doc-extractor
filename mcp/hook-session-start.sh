#!/bin/bash
# SessionStart hook: instructs Claude to arm a persistent Monitor on the
# doc-extractor queue so UI "Send to Claude" requests fire automatically.

WATCHER_SCRIPT="$HOME/.claude/hooks/doc-extractor-queue-watcher.sh"

# Skip if doc-extractor not installed
if [ ! -f "$WATCHER_SCRIPT" ]; then
  exit 0
fi

cat <<EOF
[doc-extractor integration]
The Doc Extractor UI is integrated with this Claude Code session.
To auto-detect "Send to Claude" requests from the UI, arm a persistent Monitor now using the Monitor tool:

- command: bash $WATCHER_SCRIPT
- description: Doc Extractor queue — fires when UI sends extraction to Claude
- persistent: true
- timeout_ms: 3600000

When you receive a <task-notification> from this monitor containing an extractionId, pageUrl/pageTitle, and optional userInstruction:
1. Call mcp__doc-extractor__get_extraction with the extractionId to load the content.
2. If pageUrl is given, focus your answer on that specific page only.
3. Answer the userInstruction (or present the content if no instruction).
4. Mark the queue consumed by updating the status field in ~/.claude/doc-extractor-queue/current.json.

Arm the Monitor now at the start of the session, then continue with whatever the user asks.
[/doc-extractor integration]
EOF
