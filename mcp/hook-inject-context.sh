#!/bin/bash
# UserPromptSubmit hook: injects pending doc-extractor queue context into the prompt.

QUEUE_FILE="$HOME/.claude/doc-extractor-queue/current.json"

if [ ! -f "$QUEUE_FILE" ]; then
  exit 0
fi

STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$QUEUE_FILE" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
if [ "$STATUS" != "pending" ]; then
  exit 0
fi

EXTRACTION_ID=$(grep -o '"extractionId"[[:space:]]*:[[:space:]]*"[^"]*"' "$QUEUE_FILE" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
TITLE=$(grep -o '"title"[[:space:]]*:[[:space:]]*"[^"]*"' "$QUEUE_FILE" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
PAGE_URL=$(grep -o '"pageUrl"[[:space:]]*:[[:space:]]*"[^"]*"' "$QUEUE_FILE" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
PAGE_TITLE=$(grep -o '"pageTitle"[[:space:]]*:[[:space:]]*"[^"]*"' "$QUEUE_FILE" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
INSTRUCTION=$(grep -o '"userInstruction"[[:space:]]*:[[:space:]]*"[^"]*"' "$QUEUE_FILE" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')

# Mark as consumed
sed -i.bak 's/"status"[[:space:]]*:[[:space:]]*"pending"/"status":"consumed"/' "$QUEUE_FILE" 2>/dev/null
rm -f "${QUEUE_FILE}.bak" 2>/dev/null

if [ -n "$PAGE_URL" ]; then
  SCOPE_LINE="Scope: specific page only - ${PAGE_TITLE} (${PAGE_URL})"
else
  SCOPE_LINE="Scope: entire extraction (all pages)"
fi

if [ -n "$INSTRUCTION" ]; then
  INSTRUCTION_LINE="User instruction: $INSTRUCTION"
else
  INSTRUCTION_LINE="User instruction: (none - use the extraction to answer the user's next question)"
fi

echo "[doc-extractor context]"
echo "The user sent a documentation extraction from their Doc Extractor UI:"
echo "- Source: $TITLE"
echo "- Extraction ID: $EXTRACTION_ID"
echo "- $SCOPE_LINE"
echo "- $INSTRUCTION_LINE"
echo ""
echo "Steps:"
echo "1. Call the MCP tool mcp__doc-extractor__get_extraction with id=\"$EXTRACTION_ID\" to load the full content."
echo "2. If a specific page scope was given above, focus your answer ONLY on that page's content (ignore other pages)."
echo "3. Answer the user's question grounded in that documentation, quoting relevant sections as needed."
echo "[/doc-extractor context]"
