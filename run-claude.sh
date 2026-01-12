#!/usr/bin/env bash
set -e

MAX_ITERATIONS=${MAX_ITERATIONS:-20}
COUNT=0

while grep -q "NOT IMPLEMENTED" IMPLEMENTATION_PLAN.md; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt "$MAX_ITERATIONS" ]; then
    echo "Max iterations ($MAX_ITERATIONS) reached. Stopping."
    break
  fi

  echo "=== Iteration $COUNT / $MAX_ITERATIONS ==="

  BEFORE=$(git rev-parse HEAD)

  claude -p "$(cat PROMPT.md)"

  AFTER=$(git rev-parse HEAD)

  if [ "$BEFORE" = "$AFTER" ]; then
    echo "No commit produced. Stopping."
    break
  fi
done

echo "=== Loop finished ==="
