#!/bin/bash
# Watches the doc-extractor queue file and emits when status becomes "pending"

QUEUE_FILE="$HOME/.claude/doc-extractor-queue/current.json"
LAST_ID=""

while true; do
  if [ -f "$QUEUE_FILE" ]; then
    STATUS=$(jq -r '.status // ""' "$QUEUE_FILE" 2>/dev/null)
    ID=$(jq -r '.id // .extractionId // ""' "$QUEUE_FILE" 2>/dev/null)

    if [ "$STATUS" = "pending" ] && [ "$ID" != "$LAST_ID" ]; then
      LAST_ID="$ID"
      # Emit one compact line — Monitor will pick this up
      jq -c '.' "$QUEUE_FILE" 2>/dev/null
    fi
  fi
  sleep 2
done
