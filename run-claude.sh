#!/usr/bin/env bash
set -e

while grep -q "NOT IMPLEMENTED" IMPLEMENTATION_PLAN.md; do
  echo "Running Claude..."

  BEFORE=$(git rev-parse HEAD)

  timeout 20m claude "$(cat PROMPT.md)"

  AFTER=$(git rev-parse HEAD)

  if [ "$BEFORE" = "$AFTER" ]; then
    echo "No commit produced. Stopping."
    break
  fi
done
