# Spending Dashboard

Personal finance dashboard that consolidates bank statements from CSOB, Raiffeisen, and Revolut with keyword-based categorization.

## Tech Stack

- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** React + Vite + Tailwind CSS + Chart.js
- **Testing:** Vitest (unit) + Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Environment Configuration

Copy the example environment file and customize if needed:

```bash
cp .env.example .env
```

Available environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `PORT` | `3001` | Backend server port |
| `DB_PATH` | `./backend/data/spending.db` | Path to SQLite database file |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | `info` | Log level (`error`, `warn`, `info`, `debug`) |

All variables have sensible defaults for development, so configuration is optional.

### Development

Start both backend and frontend in development mode:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Testing

Run unit tests:

```bash
npm run test
```

Run E2E tests:

```bash
npm run test:e2e
```

### Building

```bash
npm run build
```

## Project Structure

```
/spending_dashboard
├── package.json          # Workspaces root
├── backend/              # Express API server
│   ├── src/
│   │   ├── index.ts      # Entry point
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── db/           # Database operations
│   │   └── parsers/      # Bank statement parsers
│   └── tests/
├── frontend/             # React application
│   ├── src/
│   │   ├── main.tsx      # Entry point
│   │   ├── App.tsx       # Root component
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   └── api/          # API client
│   └── tests/
├── e2e/                  # Playwright E2E tests
│   └── tests/
└── shared/               # Shared TypeScript types
    └── types.ts
```
