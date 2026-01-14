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
**Status:** DONE

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
    - **Income handling:** Uncategorized transactions with positive amounts appear as "Income" category
    - **Expense handling:** Uncategorized transactions with negative amounts appear as "Uncategorized" category
    - Categorized transactions (with category_id) keep their assigned category regardless of amount sign
  - By bank (name, count, sum)
  - By month (month, count, sum) - expenses only (negative amounts)
  - Income by month (month, count, sum) - income only (positive amounts)
  - Date range (min, max)

**Acceptance Criteria:**
- [x] All endpoints work correctly
- [x] Filters combine properly (AND logic)
- [x] Pagination returns correct totals
- [x] Category update creates keyword rule
- [x] Stats endpoint returns all aggregates
- [x] Stats endpoint separates uncategorized income ("Income") from uncategorized expenses ("Uncategorized")
- [x] Unit tests for all endpoints including income/expense separation

**Dependencies:** WI-02

**Implementation Notes:**
- Created `backend/src/routes/transactions.ts` with full CRUD operations for transactions
- GET list supports all filters: date range, bank, category, uncategorized, search, pagination, sorting
- PATCH endpoint auto-creates category_rules using keyword extraction from description
- Stats endpoint returns totals, by_category, by_bank, by_month, and date_range aggregates
- **Income/Expense handling:** The `by_category` query uses CASE expression to label uncategorized positive amounts as "Income" and uncategorized negative amounts as "Uncategorized"
- Test fixtures include `seedMixedIncomeExpenseData()` for testing income vs expense scenarios
- 31 unit tests in `backend/tests/transactions.test.ts` covering all endpoints and edge cases

---

### WI-06: Categories API
**Status:** DONE

**Description:** Create CRUD API for categories.

**Requirements:**
- `GET /api/categories` - list all categories with transaction counts
- `GET /api/categories/:id` - single category with stats
- `POST /api/categories` - create new category (name, color)
- `PATCH /api/categories/:id` - update category
- `DELETE /api/categories/:id` - delete category (set transactions to null)

**Acceptance Criteria:**
- [x] All CRUD operations work
- [x] Category list includes transaction counts
- [x] Cannot create duplicate names
- [x] Delete handles foreign key gracefully
- [x] Unit tests pass

**Dependencies:** WI-02

**Implementation Notes:**
- Created `backend/src/routes/categories.ts` with full CRUD operations for categories
- GET list returns categories ordered by name with transaction counts via LEFT JOIN
- GET single returns category with transaction_count and total_amount stats
- POST validates name/color, enforces unique names (case-insensitive), validates hex color format
- PATCH supports partial updates of name and/or color with duplicate name checks
- DELETE returns count of affected transactions; foreign key ON DELETE SET NULL handles transactions
- 18 unit tests in `backend/tests/categories.test.ts` covering all endpoints and edge cases

---

### WI-07: Category Rules API
**Status:** DONE

**Description:** Create CRUD API for categorization rules.

**Requirements:**
- `GET /api/rules` - list all rules with category names
- `POST /api/rules` - create new rule (keyword, category_id)
- `PATCH /api/rules/:id` - update rule
- `DELETE /api/rules/:id` - delete rule
- `POST /api/rules/apply` - re-apply all rules to uncategorized transactions

**Acceptance Criteria:**
- [x] All CRUD operations work
- [x] Keywords are case-insensitive
- [x] Apply endpoint categorizes existing transactions
- [x] Unit tests pass

**Dependencies:** WI-02

**Implementation Notes:**
- Created `backend/src/routes/rules.ts` with full CRUD operations for category rules
- GET list returns rules ordered by keyword with category names via JOIN
- POST validates keyword/category_id, enforces unique keywords (case-insensitive), stores keywords lowercase
- PATCH supports partial updates of keyword and/or category_id with duplicate keyword checks
- DELETE removes rule and returns success status
- POST /apply re-applies all rules to uncategorized transactions using case-insensitive substring matching
- 20 unit tests in `backend/tests/rules.test.ts` covering all endpoints and edge cases

---

### WI-08: Export API
**Status:** DONE

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
- [x] CSV export has proper headers and escaping
- [x] JSON export is valid and well-structured
- [x] Filters work same as transactions list
- [x] File downloads with correct Content-Disposition
- [x] Unit tests pass

**Dependencies:** WI-05

**Implementation Notes:**
- Created `backend/src/routes/export.ts` with two endpoints: `/transactions` and `/summary`
- CSV escaping handles commas, quotes, and newlines per RFC 4180
- Both endpoints support same filters as transactions list (startDate, endDate, bank, category, uncategorized, search)
- Summary endpoint returns totals, by_category, by_month, and by_category_month groupings
- Content-Disposition header set with date-stamped filenames for proper file downloads
- 23 unit tests in `backend/tests/export.test.ts` covering filters, escaping, JSON structure, and filenames

---

### WI-09: Frontend Shell & Routing
**Status:** DONE

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
- [x] Navigation between all pages works
- [x] Mobile responsive (sidebar toggle)
- [x] API client handles errors uniformly
- [x] Loading states shown during API calls
- [x] Clean, modern UI with Tailwind

**Dependencies:** WI-01

**Implementation Notes:**
- Created `frontend/src/api/client.ts` with typed API client supporting GET/POST/PATCH/DELETE, file upload, and download
- Created `frontend/src/components/Sidebar.tsx` with responsive navigation (slides in on mobile, static on desktop)
- Created loading/error components: `LoadingSpinner.tsx`, `ErrorMessage.tsx`, `PageLoading.tsx`
- Created page placeholders: `DashboardPage.tsx`, `TransactionsPage.tsx`, `UploadPage.tsx`, `RulesPage.tsx`
- Updated `App.tsx` with full layout shell, header with mobile menu toggle, and React Router routes
- All components use Tailwind CSS for styling with responsive breakpoints (lg:)

---

### WI-10: Upload Page
**Status:** DONE

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
- [x] Drag-and-drop works
- [x] Multiple files can be selected
- [x] Progress shown during upload
- [x] Success shows: "Imported X transactions from Y banks"
- [x] Errors displayed clearly
- [x] E2E test: upload dummy files and verify

**Dependencies:** WI-04, WI-09

**Implementation Notes:**
- Created `frontend/src/pages/UploadPage.tsx` with complete upload interface
- Drag-and-drop zone with visual feedback (border/background color change on drag over)
- File browser fallback via hidden file input triggered by Browse Files button
- Supports multiple files with validation (CSV, TXT, XLSX, XLS, max 5MB each, up to 10 files)
- File list displays name, size with remove buttons and "Clear all" option
- Loading spinner shown during upload, button disabled while uploading
- 12 E2E tests in `e2e/tests/upload.spec.ts` covering all acceptance criteria

---

### WI-11: Transactions Page
**Status:** DONE

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
- [x] All transactions displayed correctly
- [x] Filters work and update URL params
- [x] Inline category edit works
- [x] Pagination shows total count
- [x] Export downloads file
- [x] E2E test: filter, edit category, verify

**Dependencies:** WI-05, WI-06, WI-09

**Implementation Notes:**
- Created `frontend/src/pages/TransactionsPage.tsx` with full feature set
- Table with sortable columns (Date, Description, Amount, Bank, Category) via column header clicks
- Filter panel with date range, bank checkboxes, category checkboxes, search input, and uncategorized toggle
- All filters sync to URL params using React Router's useSearchParams
- Inline category editing: click category cell opens dropdown, selection saves via PATCH API
- Pagination with 50 items per page, Previous/Next buttons, and total count display
- Export modal with CSV and JSON download options using the /api/export/transactions endpoint
- 7 E2E tests in `e2e/tests/transactions.spec.ts` covering all features

---

### WI-12: Dashboard Page
**Status:** DONE

**Description:** Create main dashboard with charts and stats.

**Requirements:**
- Quick stats cards:
  - Total spending (in period) - calculated from expenses only
  - Transaction count
  - Average transaction
  - Largest expense category - from expenses only, not income
- Spending by category pie chart (expenses only)
  - Shows only expense categories (negative amounts)
  - "Uncategorized" category (gray color) for uncategorized expenses
  - Excludes Income from pie chart
  - Regular categories use chart color palette
- Spending by bank bar chart
- Spending over time line chart (by month) - expenses only
- Income over time line chart (by month) - income only
- Recent transactions list (last 10)
- Date range selector (affects all charts)
- Default to last 3 months

**Acceptance Criteria:**
- [x] All charts render with real data
- [x] Charts are interactive (hover shows values)
- [x] Date range filter updates all components
- [x] Empty state when no data
- [x] Responsive on tablet/mobile
- [x] Pie chart shows only expenses, excludes Income
- [x] Pie chart shows "Uncategorized" category for uncategorized expenses (gray color)
- [x] "Largest Category" stat card uses expenses only
- [x] "Total Spending" stat card uses expenses only
- [x] Income over Time chart shows monthly income (emerald color)
- [x] E2E test: verify charts appear with data

**Dependencies:** WI-05, WI-09

**Implementation Notes:**
- Created `frontend/src/pages/DashboardPage.tsx` with complete dashboard implementation using Chart.js/react-chartjs-2
- Quick stats cards show total spending, transaction count, average transaction, and largest category expense (all from expenses only)
- Four charts: Pie (spending by category), Bar (spending by bank), Line (spending over time), Line (income over time)
- **Pie chart:** Only shows expenses (negative amounts), excludes Income category; Uncategorized uses gray (#6b7280)
- **Income chart:** Uses emerald color (#10b981) for income line
- Recent transactions table showing last 10 transactions with "View all" link to Transactions page
- Date range selector defaults to last 3 months; filters update all components via parallel API calls
- Empty state with chart icon and "Upload Statements" button when no data available
- Stats API returns separate `by_month` (expenses) and `income_by_month` (income) arrays
- 8 E2E tests in `e2e/tests/dashboard.spec.ts` covering all acceptance criteria

---

### WI-13: Rules Management Page
**Status:** DONE

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
- [x] All rules displayed
- [x] Add, edit, delete work
- [x] Apply rules updates transaction count
- [x] Confirmation before delete
- [x] E2E test: add rule, apply, verify transaction categorized

**Dependencies:** WI-07, WI-09

**Implementation Notes:**
- Created `frontend/src/pages/RulesPage.tsx` with complete rules management interface
- Rules table displays keyword, category (with color dot), created date, and action buttons
- Add New Rule form with keyword input and category dropdown; form clears on successful add
- Inline edit mode: click edit button transforms row to show input/select fields
- Delete confirmation: click delete shows "Delete?" with confirm/cancel buttons
- Apply Rules button calls `/api/rules/apply` and shows success message with categorization count
- 8 E2E tests in `e2e/tests/rules.spec.ts` covering all acceptance criteria

---

### WI-14: Categorization Engine
**Status:** DONE

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
- [x] Categorize finds matching rules
- [x] Keyword extraction produces sensible keywords
- [x] Batch categorization is efficient
- [x] Learning creates new rules correctly
- [x] Unit tests with various descriptions

**Dependencies:** WI-02, WI-07

**Implementation Notes:**
- Created `backend/src/services/categorizationService.ts` with full `CategorizationService` class
- `extractKeyword()` skips 60+ stop words (payment terms, prepositions, abbreviations, currency codes)
- `categorize()` loads rules from DB and uses case-insensitive substring matching
- `categorizeAll()` loads rules once and applies to all transactions efficiently (Map of index→category_id)
- `learnRule()` extracts keyword, validates category, checks duplicates, returns success/failure status
- 36 unit tests in `backend/tests/categorization.test.ts` covering all methods and edge cases

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

**Blocking issues:**
- No sample CSOB CSV files exist in the repository
- Cannot implement real parsing logic without actual file format examples
- Cannot write unit tests without sample data to test against
- Acceptance criteria "Parses real CSOB statements correctly" and "Unit tests with sample file" require real files

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
**Status:** DONE

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
- [x] No unhandled promise rejections
- [x] User sees friendly error messages
- [x] Errors logged for debugging
- [x] E2E test: upload invalid file, verify error shown

**Dependencies:** WI-04, WI-09

**Implementation Notes:**
- Created `backend/src/middleware/errorHandler.ts` with global error handler, custom error classes (AppError, ValidationError, NotFoundError, BadRequestError), and logger utility
- Added 404 handler for unmatched API routes and integrated global error handler in `backend/src/index.ts`
- Created `frontend/src/components/Toast.tsx` with ToastProvider context and toast notification system
- Enhanced `frontend/src/api/client.ts` with retry mechanism (exponential backoff for GET requests) and network error detection
- Updated `backend/src/routes/upload.ts` with file validation for empty files, corrupted content, and improved error propagation
- Added E2E test in `e2e/tests/upload.spec.ts` for empty file upload error handling

---

### WI-19: E2E Test Suite
**Status:** DONE

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
- [x] All 5 test flows pass
- [x] Tests run in under 2 minutes
- [x] Can run in CI environment
- [x] Failures produce useful screenshots/logs

**Dependencies:** WI-10, WI-11, WI-12, WI-13

**Implementation Notes:**
- Created `e2e/tests/user-flows.spec.ts` with comprehensive tests for all 5 user flows
- Flow 1: Upload flow tests file selection, upload success, bank breakdown, and navigation
- Flow 2: Dashboard flow tests charts, stats cards, date range filtering, and empty state
- Flow 3: Transactions flow tests filtering by bank, search, uncategorized filter, and inline category editing
- Flow 4: Rules flow tests adding rules, applying rules to categorize transactions, edit, and delete
- Flow 5: Export flow tests CSV and JSON downloads with filters applied
- Updated `e2e/playwright.config.ts` with CI-ready settings: HTML reporter, screenshots on failure, video on retry, output directory for artifacts

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
