#!/bin/bash
# Stop hook: marks consumed queue requests as done so the UI stops showing "processing".

QUEUE_FILE="$HOME/.claude/doc-extractor-queue/current.json"

if [ ! -f "$QUEUE_FILE" ]; then
  exit 0
fi

STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$QUEUE_FILE" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
if [ "$STATUS" != "consumed" ]; then
  exit 0
fi

sed -i.bak 's/"status"[[:space:]]*:[[:space:]]*"consumed"/"status":"done"/' "$QUEUE_FILE" 2>/dev/null
rm -f "${QUEUE_FILE}.bak" 2>/dev/null
exit 0
