# Implementation Plan: Bank Statement Dashboard

## Overview
Building a personal finance dashboard that consolidates bank statements from CSOB, Raiffeisen, and Revolut with keyword-based categorization.

**Tech Stack:**
- Backend: Node.js + Express + SQLite (better-sqlite3)
- Frontend: React + Vite + Tailwind CSS + Chart.js
- Testing: Vitest (unit) + Playwright (E2E)

---

## Work Items

### WI-01: Project Infrastructure Setup
**Status:** DONE

**Description:** Initialize the monorepo structure with backend and frontend, configure all tooling, and create the testing harness.

**Requirements:**
- Create project root with `package.json` (npm workspaces)
- Create `/backend` folder with Express server skeleton
- Create `/frontend` folder with Vite + React + Tailwind
- Configure TypeScript for both
- Set up Vitest for unit tests
- Set up Playwright for E2E tests
- Create npm scripts: `dev`, `build`, `test`, `test:e2e`
- Add `.gitignore`, `README.md`

**Folder Structure:**
```
/spending_dashboard
├── package.json (workspaces root)
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts (Express entry)
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   └── parsers/
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/
│   └── tests/
├── e2e/
│   ├── playwright.config.ts
│   └── tests/
└── shared/
    └── types.ts
```

**Acceptance Criteria:**
- [x] `npm install` works from root
- [x] `npm run dev` starts both backend (port 3001) and frontend (port 3000)
- [x] `npm run test` runs unit tests (can be empty initially)
- [x] `npm run test:e2e` runs Playwright tests (can be empty initially)
- [x] Frontend proxies API requests to backend
- [x] TypeScript compiles without errors

**Dependencies:** None

**Implementation Notes:**
- Created monorepo with npm workspaces (backend, frontend, shared, e2e)
- Backend uses Express + TypeScript with tsx for dev server on port 3001
- Frontend uses Vite + React + Tailwind CSS with proxy to backend on port 3000
- Vitest configured for both backend (node environment) and frontend (jsdom environment)
- Playwright configured in e2e workspace with chromium for E2E tests
- Shared types package created with TypeScript interfaces for all entities

---

### WI-02: Database Schema & Setup
**Status:** DONE

**Description:** Create SQLite database with all tables, migrations, and seed data.

**Requirements:**
- Create database initialization script
- Create all tables as per PRD schema:
  - `transactions` (id, date, amount, description, bank, category_id, created_at)
  - `categories` (id, name, color)
  - `category_rules` (id, keyword, category_id, created_at)
  - `upload_log` (id, filename, bank, transaction_count, upload_date)
- Seed default categories with colors:
  - Food (#22c55e)
  - Transport (#3b82f6)
  - Shopping (#f59e0b)
  - Entertainment (#8b5cf6)
  - Health (#ef4444)
  - Utilities (#06b6d4)
  - Finance (#64748b)
  - Other (#9ca3af)
- Create database service with connection management
- Add indexes for common queries (date, bank, category_id)

**Acceptance Criteria:**
- [x] Database file created at `backend/data/spending.db`
- [x] All tables created with correct schema
- [x] Default categories seeded on first run
- [x] Unit tests for database operations pass
- [x] Database handles concurrent access gracefully

**Dependencies:** WI-01

**Implementation Notes:**
- Created `backend/src/db/database.ts` with SQLite database service using better-sqlite3
- Database uses WAL mode for better concurrency and foreign keys enabled
- All 4 tables created: categories, transactions, category_rules, upload_log
- Indexes created for date, bank, category_id, and keyword fields
- Dynamic DB_PATH via `getDbPath()` function to support test environment configuration
- 15 unit tests in `backend/tests/database.test.ts` covering schema, seeding, indexes, constraints, and concurrency

---

### WI-03: Bank Parser Interface & Dummy Parsers
**Status:** DONE

**Description:** Create parser interface/facade and dummy implementations for all 3 banks with sample data.

**Requirements:**
- Create `BankParser` interface:
  ```typescript
  interface ParsedTransaction {
    date: string;        // ISO format YYYY-MM-DD
    amount: number;      // negative for expenses
    description: string;
    bank: 'CSOB' | 'Raiffeisen' | 'Revolut';
    originalCategory?: string; // for Revolut
  }

  interface BankParser {
    detect(buffer: Buffer, filename: string): boolean;
    parse(buffer: Buffer): Promise<ParsedTransaction[]>;
    bankName: string;
  }
  ```
- Create `CsobParser` with dummy implementation returning 10 sample transactions
- Create `RaiffeisenParser` with dummy implementation returning 10 sample transactions
- Create `RevolutParser` with dummy implementation returning 10 sample transactions
- Create `ParserService` that auto-detects bank and delegates to correct parser
- Include sample transactions with realistic descriptions (ALBERT, LIDL, SHELL, etc.)

**Acceptance Criteria:**
- [x] `ParserService.parse(buffer, filename)` returns parsed transactions
- [x] Bank auto-detection works based on file content/name patterns
- [x] Each dummy parser returns 10 realistic sample transactions
- [x] Unit tests verify parser interface contract
- [x] Easy to swap dummy implementations for real ones later

**Dependencies:** WI-01

**Implementation Notes:**
- Created `BankParser` interface in `backend/src/parsers/types.ts` (uses `ParsedTransaction` from shared/types)
- Implemented `CsobParser`, `RaiffeisenParser`, `RevolutParser` with dummy data
- Each parser has `detect()` method checking filename patterns and content markers
- `ParserService` auto-detects bank and delegates parsing, with `registerParser()` for extensibility
- `RevolutParser` includes `originalCategory` on all sample transactions
- 44 unit tests in `backend/tests/parsers.test.ts` covering interface contract, detection, and parsing

---

### WI-04: Upload API Endpoint
**Status:** DONE

**Description:** Create file upload endpoint that processes bank statements.

**Requirements:**
- `POST /api/upload` - accepts multipart file upload
- Support multiple files in single request
- For each file:
  - Detect bank type using ParserService
  - Parse transactions
  - Apply categorization rules
  - Deduplicate against existing transactions (same date + amount + description + bank)
  - Insert new transactions into database
  - Log upload to `upload_log` table
- Return summary: `{ success: true, imported: 45, duplicates: 5, byBank: { CSOB: 20, Revolut: 25 } }`
- Handle errors gracefully (invalid file, parsing errors)

**Acceptance Criteria:**
- [x] Endpoint accepts file uploads
- [x] Correct bank detection and parsing
- [x] Categorization applied to new transactions
- [x] Duplicates detected and skipped
- [x] Upload logged to database
- [x] Returns accurate import summary
- [x] Unit tests for upload logic
- [x] Error responses have clear messages

**Dependencies:** WI-02, WI-03

**Implementation Notes:**
- Created `backend/src/routes/upload.ts` with multer middleware for multipart file handling
- Created `backend/src/services/uploadService.ts` with core upload processing logic
- Supports CSV, TXT, XLS, XLSX files up to 5MB, max 10 files per request
- Deduplication checks date + amount + description + bank for exact match
- Categorization uses case-insensitive keyword matching from category_rules table
- 14 unit tests in `backend/tests/upload.test.ts` covering imports, duplicates, categorization, and error handling

---

### WI-05: Transactions API
**Status:** NOT IMPLEMENTED

**Description:** Create CRUD API for transactions.

**Requirements:**
- `GET /api/transactions` - list with filters:
  - `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - `?bank=CSOB,Revolut`
  - `?category=1,2,3` (category IDs)
  - `?uncategorized=true` (only null category_id)
  - `?search=starbucks` (description search)
  - `?limit=50&offset=0` (pagination)
  - `?sort=date&order=desc`
- `GET /api/transactions/:id` - single transaction
- `PATCH /api/transactions/:id` - update category
  - When category is set, auto-create rule from description keyword
- `DELETE /api/transactions/:id` - delete transaction
- `GET /api/transactions/stats` - aggregate stats:
  - Total count, total amount
  - By category (name, count, sum)
  - By bank (name, count, sum)
  - By month (month, count, sum)
  - Date range (min, max)

**Acceptance Criteria:**
- [ ] All endpoints work correctly
- [ ] Filters combine properly (AND logic)
- [ ] Pagination returns correct totals
- [ ] Category update creates keyword rule
- [ ] Stats endpoint returns all aggregates
- [ ] Unit tests for all endpoints

**Dependencies:** WI-02

---

### WI-06: Categories API
**Status:** NOT IMPLEMENTED

**Description:** Create CRUD API for categories.

**Requirements:**
- `GET /api/categories` - list all categories with transaction counts
- `GET /api/categories/:id` - single category with stats
- `POST /api/categories` - create new category (name, color)
- `PATCH /api/categories/:id` - update category
- `DELETE /api/categories/:id` - delete category (set transactions to null)

**Acceptance Criteria:**
- [ ] All CRUD operations work
- [ ] Category list includes transaction counts
- [ ] Cannot create duplicate names
- [ ] Delete handles foreign key gracefully
- [ ] Unit tests pass

**Dependencies:** WI-02

---

### WI-07: Category Rules API
**Status:** NOT IMPLEMENTED

**Description:** Create CRUD API for categorization rules.

**Requirements:**
- `GET /api/rules` - list all rules with category names
- `POST /api/rules` - create new rule (keyword, category_id)
- `PATCH /api/rules/:id` - update rule
- `DELETE /api/rules/:id` - delete rule
- `POST /api/rules/apply` - re-apply all rules to uncategorized transactions

**Acceptance Criteria:**
- [ ] All CRUD operations work
- [ ] Keywords are case-insensitive
- [ ] Apply endpoint categorizes existing transactions
- [ ] Unit tests pass

**Dependencies:** WI-02

---

### WI-08: Export API
**Status:** NOT IMPLEMENTED

**Description:** Create export endpoints for data download.

**Requirements:**
- `GET /api/export/transactions` - export transactions
  - Accepts same filters as transactions list
  - `?format=csv` or `?format=json`
  - Returns file download with appropriate headers
- `GET /api/export/summary` - export summary report
  - Grouped by category and month
  - CSV or JSON format

**Acceptance Criteria:**
- [ ] CSV export has proper headers and escaping
- [ ] JSON export is valid and well-structured
- [ ] Filters work same as transactions list
- [ ] File downloads with correct Content-Disposition
- [ ] Unit tests pass

**Dependencies:** WI-05

---

### WI-09: Frontend Shell & Routing
**Status:** NOT IMPLEMENTED

**Description:** Create the main app shell with navigation and routing.

**Requirements:**
- App shell with sidebar navigation:
  - Dashboard (home)
  - Transactions
  - Upload
  - Rules
- React Router for navigation
- Responsive layout (sidebar collapses on mobile)
- Header with app title
- API client utility for backend calls
- Loading and error states

**Acceptance Criteria:**
- [ ] Navigation between all pages works
- [ ] Mobile responsive (sidebar toggle)
- [ ] API client handles errors uniformly
- [ ] Loading states shown during API calls
- [ ] Clean, modern UI with Tailwind

**Dependencies:** WI-01

---

### WI-10: Upload Page
**Status:** NOT IMPLEMENTED

**Description:** Create file upload interface.

**Requirements:**
- Drag-and-drop zone for files
- File browser fallback
- Support multiple files
- Show file list before upload
- Upload progress indicator
- Success/error feedback with import summary
- Navigate to transactions after successful upload

**Acceptance Criteria:**
- [ ] Drag-and-drop works
- [ ] Multiple files can be selected
- [ ] Progress shown during upload
- [ ] Success shows: "Imported X transactions from Y banks"
- [ ] Errors displayed clearly
- [ ] E2E test: upload dummy files and verify

**Dependencies:** WI-04, WI-09

---

### WI-11: Transactions Page
**Status:** NOT IMPLEMENTED

**Description:** Create transactions list with filtering and inline editing.

**Requirements:**
- Table view of transactions:
  - Date, Description, Amount, Bank, Category
  - Color-coded by category
  - Sort by any column
- Filter panel:
  - Date range picker
  - Bank checkboxes
  - Category checkboxes
  - Search input
  - "Uncategorized only" toggle
- Inline category editing:
  - Click category cell → dropdown
  - Select category → saves immediately
- Pagination (50 per page)
- Export button (opens modal with format options)

**Acceptance Criteria:**
- [ ] All transactions displayed correctly
- [ ] Filters work and update URL params
- [ ] Inline category edit works
- [ ] Pagination shows total count
- [ ] Export downloads file
- [ ] E2E test: filter, edit category, verify

**Dependencies:** WI-05, WI-06, WI-09

---

### WI-12: Dashboard Page
**Status:** NOT IMPLEMENTED

**Description:** Create main dashboard with charts and stats.

**Requirements:**
- Quick stats cards:
  - Total spending (in period)
  - Transaction count
  - Average transaction
  - Largest expense
- Spending by category pie chart
- Spending by bank bar chart
- Spending over time line chart (by month)
- Recent transactions list (last 10)
- Date range selector (affects all charts)
- Default to last 3 months

**Acceptance Criteria:**
- [ ] All charts render with real data
- [ ] Charts are interactive (hover shows values)
- [ ] Date range filter updates all components
- [ ] Empty state when no data
- [ ] Responsive on tablet/mobile
- [ ] E2E test: verify charts appear with data

**Dependencies:** WI-05, WI-09

---

### WI-13: Rules Management Page
**Status:** NOT IMPLEMENTED

**Description:** Create page to view and manage categorization rules.

**Requirements:**
- Table of all rules:
  - Keyword, Category, Created date
  - Edit button (inline or modal)
  - Delete button with confirmation
- Add new rule form:
  - Keyword input
  - Category dropdown
- "Apply Rules" button to re-categorize uncategorized transactions
- Show count of uncategorized transactions

**Acceptance Criteria:**
- [ ] All rules displayed
- [ ] Add, edit, delete work
- [ ] Apply rules updates transaction count
- [ ] Confirmation before delete
- [ ] E2E test: add rule, apply, verify transaction categorized

**Dependencies:** WI-07, WI-09

---

### WI-14: Categorization Engine
**Status:** NOT IMPLEMENTED

**Description:** Implement the keyword matching logic for auto-categorization.

**Requirements:**
- `CategorizationService` with:
  - `categorize(transaction)` - find matching rule
  - `categorizeAll(transactions)` - batch categorize
  - `learnRule(description, categoryId)` - extract keyword and create rule
- Keyword extraction logic:
  - Use first significant word from description
  - Skip common words (payment, transfer, etc.)
  - Case-insensitive matching
- Match against existing rules (substring match)
- Return category_id or null if no match

**Acceptance Criteria:**
- [ ] Categorize finds matching rules
- [ ] Keyword extraction produces sensible keywords
- [ ] Batch categorization is efficient
- [ ] Learning creates new rules correctly
- [ ] Unit tests with various descriptions

**Dependencies:** WI-02, WI-07

---

### WI-15: CSOB Parser Implementation
**Status:** NOT IMPLEMENTED

**Description:** Implement real CSOB CSV parser when sample files are provided.

**Requirements:**
- Parse actual CSOB CSV format
- Handle Windows-1250 and UTF-8 encodings
- Map columns to ParsedTransaction
- Handle date format conversion
- Handle amount format (Czech decimal separator)
- Detect CSOB format reliably

**Acceptance Criteria:**
- [ ] Parses real CSOB statements correctly
- [ ] Handles encoding properly
- [ ] All transactions extracted with correct data
- [ ] Unit tests with sample file

**Dependencies:** WI-03 (will update dummy implementation)

**Note:** Blocked until sample files provided

---

### WI-16: Raiffeisen Parser Implementation
**Status:** NOT IMPLEMENTED

**Description:** Implement real Raiffeisen CSV parser when sample files are provided.

**Requirements:**
- Parse actual Raiffeisen CSV format
- Handle Czech column names (Datum, Částka, Popis)
- Handle Windows-1250 and UTF-8 encodings
- Map columns to ParsedTransaction
- Handle date/amount format conversion
- Detect Raiffeisen format reliably

**Acceptance Criteria:**
- [ ] Parses real Raiffeisen statements correctly
- [ ] Handles Czech characters properly
- [ ] All transactions extracted with correct data
- [ ] Unit tests with sample file

**Dependencies:** WI-03 (will update dummy implementation)

**Note:** Blocked until sample files provided

---

### WI-17: Revolut Parser Implementation
**Status:** NOT IMPLEMENTED

**Description:** Implement real Revolut parser when sample files are provided.

**Requirements:**
- Parse Revolut CSV and Excel formats
- Map columns to ParsedTransaction
- Extract existing category from Revolut data
- Handle date/amount format conversion
- Detect Revolut format reliably

**Acceptance Criteria:**
- [ ] Parses real Revolut statements correctly
- [ ] Excel (.xlsx) support works
- [ ] Revolut categories extracted
- [ ] All transactions extracted with correct data
- [ ] Unit tests with sample file

**Dependencies:** WI-03 (will update dummy implementation)

**Note:** Blocked until sample files provided

---

### WI-18: Error Handling & Edge Cases
**Status:** NOT IMPLEMENTED

**Description:** Comprehensive error handling across the application.

**Requirements:**
- Backend:
  - Global error handler middleware
  - Validation errors return 400 with details
  - Not found returns 404
  - Server errors return 500 with safe message
  - Log errors to console (dev) or file (prod)
- Frontend:
  - Toast notifications for errors
  - Retry mechanism for failed requests
  - Graceful degradation when backend unavailable
- File upload:
  - Invalid file type detection
  - Empty file handling
  - Corrupted file handling
  - Size limit (5MB)

**Acceptance Criteria:**
- [ ] No unhandled promise rejections
- [ ] User sees friendly error messages
- [ ] Errors logged for debugging
- [ ] E2E test: upload invalid file, verify error shown

**Dependencies:** WI-04, WI-09

---

### WI-19: E2E Test Suite
**Status:** NOT IMPLEMENTED

**Description:** Comprehensive end-to-end tests for all user flows.

**Requirements:**
- Test setup with database seeding
- Tests:
  1. Upload flow: upload files → see success → navigate to transactions
  2. Dashboard flow: view charts → change date range → verify update
  3. Transactions flow: filter → search → change category → verify
  4. Rules flow: add rule → apply → verify categorization
  5. Export flow: filter transactions → export CSV → verify download
- Run in CI (headless mode)
- Screenshots on failure

**Acceptance Criteria:**
- [ ] All 5 test flows pass
- [ ] Tests run in under 2 minutes
- [ ] Can run in CI environment
- [ ] Failures produce useful screenshots/logs

**Dependencies:** WI-10, WI-11, WI-12, WI-13

---

### WI-20: Documentation & Final Polish
**Status:** NOT IMPLEMENTED

**Description:** Final documentation and polish.

**Requirements:**
- README.md with:
  - Project overview
  - Setup instructions
  - Development commands
  - Architecture overview
- CLAUDE.md for AI assistants
- Code comments for complex logic
- Remove console.logs (use proper logger)
- Verify all npm scripts work
- Test fresh install on clean machine

**Acceptance Criteria:**
- [ ] README covers all essentials
- [ ] CLAUDE.md created
- [ ] `npm install && npm run dev` works from scratch
- [ ] No linting errors
- [ ] No TypeScript errors

**Dependencies:** All other WIs

---

## Execution Order

```
Phase 1: Foundation
  WI-01 → WI-02 → WI-03

Phase 2: Backend APIs (can parallelize)
  WI-04, WI-05, WI-06, WI-07 → WI-08, WI-14

Phase 3: Frontend (can parallelize after WI-09)
  WI-09 → WI-10, WI-11, WI-12, WI-13

Phase 4: Integration & Testing
  WI-18 → WI-19

Phase 5: Parser Implementation (when files available)
  WI-15, WI-16, WI-17

Phase 6: Finalization
  WI-20
```

---

## Verification

After all work items complete:

1. **Fresh Install Test:**
   ```bash
   rm -rf node_modules */node_modules
   npm install
   npm run dev
   # Visit http://localhost:3000
   ```

2. **Full User Flow:**
   - Upload dummy files
   - View dashboard charts
   - Browse transactions
   - Change a category
   - Add a rule
   - Export data

3. **Run All Tests:**
   ```bash
   npm run test
   npm run test:e2e
   ```

4. **Check Production Build:**
   ```bash
   npm run build
   npm start
   ```
