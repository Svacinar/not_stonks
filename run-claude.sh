#!/usr/bin/env bash
set -e

MAX_ITERATIONS=${MAX_ITERATIONS:-20}
PLAN_FILE=${PLAN_FILE:-IMPLEMENTATION_PLAN.md}
COUNT=0

while grep -q "NOT IMPLEMENTED" "$PLAN_FILE"; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -gt "$MAX_ITERATIONS" ]; then
    echo "Max iterations ($MAX_ITERATIONS) reached. Stopping."
    break
  fi

  echo "=== Iteration $COUNT / $MAX_ITERATIONS ==="

  BEFORE=$(git rev-parse HEAD)

  claude -p "$(sed "s/\${PLAN_FILE}/$PLAN_FILE/g" PROMPT.md)" --output-format stream-json --verbose

  AFTER=$(git rev-parse HEAD)

  if [ "$BEFORE" = "$AFTER" ]; then
    echo "No commit produced. Stopping."
    break
  fi
done

echo "=== Loop finished ==="
