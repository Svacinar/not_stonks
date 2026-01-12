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
