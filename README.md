# Spending Dashboard

A personal finance dashboard for analyzing bank statements from Czech banks (CSOB, Raiffeisen) and Revolut, with intelligent keyword-based transaction categorization.

## Features

- **Multi-Bank Support** - Import statements from CSOB, Raiffeisen, and Revolut (CSV/XLSX formats)
- **Smart Categorization** - Keyword-based rules automatically categorize transactions
- **Interactive Analytics** - Pie charts, bar charts, and trend lines for spending insights
- **Transaction Management** - Filter, search, sort, and bulk-categorize transactions
- **Dark/Light Mode** - Full theme support with modern UI (shadcn/ui)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (better-sqlite3) |
| Testing | Vitest (unit), Playwright (E2E) |

## Quick Start (Docker)

The easiest way to run the application:

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

Access the dashboard at **http://localhost:3001**

Data is persisted in a Docker volume, so your transactions survive container restarts.

## Development Setup

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

### Environment Configuration

Copy `.env.example` to `.env` to customize settings. All variables have sensible defaults for development.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `DB_PATH` | `./backend/data/spending.db` | SQLite database path |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins |

## Project Structure

```
/spending_dashboard
├── backend/              # Express API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── db/           # Database operations
│   │   └── parsers/      # Bank statement parsers
│   └── tests/
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   └── api/          # API client
│   └── tests/
├── e2e/                  # Playwright E2E tests
└── shared/               # Shared TypeScript types
```

---

## How This Was Built: Claude Code in a Loop

This project was not built by a human typing code. Instead, it was built autonomously by [Claude Code](https://docs.anthropic.com/en/docs/claude-code) running in a loop until the job was done.

### The Architecture

Three files orchestrate the autonomous development:

```
run-claude.sh          # The loop script
PROMPT.md              # Instructions for Claude
IMPLEMENTATION_PLAN.md # Work breakdown with 20 items
```

### The Loop (`run-claude.sh`)

```bash
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
```

**How it works:**
1. Loop continues while any work item is marked "NOT IMPLEMENTED"
2. Each iteration invokes Claude with the system prompt
3. Claude picks the next eligible work item, implements it, runs tests, and commits
4. If no commit is produced (blocked or done), the loop exits

### The Prompt (`PROMPT.md`)

The prompt instructs Claude to:
1. Scan `IMPLEMENTATION_PLAN.md` from top to bottom
2. Find the first "NOT IMPLEMENTED" item whose dependencies are all "DONE"
3. Implement according to requirements and acceptance criteria
4. Run `npm run test` and `npm run build` - **all tests must pass**
5. Create exactly ONE commit with format `WI-XX: Short title`
6. Mark the item as DONE and exit

If dependencies aren't met, Claude adds a "Blocking issues" note and exits without changes.

### The Plan (`IMPLEMENTATION_PLAN.md`)

A structured work breakdown with 20 work items covering:
- Database schema and setup
- Bank parsers (CSOB, Raiffeisen, Revolut)
- REST API endpoints (transactions, categories, rules, upload, export)
- Frontend pages (Dashboard, Transactions, Upload, Rules)
- Categorization engine
- Error handling and E2E tests
- Documentation

Each work item includes:
- Description and requirements
- Acceptance criteria (checkboxes)
- Dependencies on other work items
- Implementation notes (filled in after completion)

### Results

| Metric | Value |
|--------|-------|
| Total Work Items | 20 |
| Completed | 16 (80%) |
| Remaining | 4 (blocked on sample bank files) |
| Commits | 1 per work item |

The entire backend API, frontend UI, test suites, and Docker configuration were built through this autonomous loop process.

### Why This Works

- **Deterministic** - One work item per run, measurable progress
- **Dependency-aware** - Won't implement blocked items
- **Test-driven** - All code must pass tests before commit
- **Self-documenting** - Plan file tracks both instructions and progress
- **Resumable** - Can stop/restart anytime; Claude reads the plan and continues

---

## License

MIT
