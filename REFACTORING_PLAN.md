# Refactoring Plan: Bank Statement Dashboard

## Overview

This document outlines findings from a comprehensive codebase analysis identifying problems, gaps, and areas for improvement.

**Context:** This is a personal finance dashboard for local/personal use. Authentication is not required.

**Analysis Summary:**
- Backend Issues: 42 findings (3 high, 17 medium, 22 low)
- Frontend Issues: 30 findings (5 high, 18 medium, 7 low)
- Infrastructure Issues: 25+ findings including test coverage gaps

---

## Work Items - UX Critical (Fix First)

### WR-01: Fix Missing Input Border Classes
**Status:** DONE
**Severity:** HIGH (UX)

**Problem:** Multiple input fields have `border-gray-300` without `border` class, making fields invisible.

**Files Affected:**
- `frontend/src/pages/TransactionsPage.tsx:238, 338, 344`
- `frontend/src/pages/RulesPage.tsx:295, 303, 387-391, 400-407`

**Acceptance Criteria:**
- [x] All input fields have `border` class
- [x] All select elements have `border` class
- [x] Visual inspection confirms fields visible

**Implementation Notes:**
- Added `border` class to search input in TransactionsPage.tsx (line 344)
- Added `border` class to category select in TransactionsPage.tsx (line 503)
- Added `border` class to newKeyword input in RulesPage.tsx (line 295)
- Added `border` class to newCategory select in RulesPage.tsx (line 307)
- Added `border` class to editKeyword input in RulesPage.tsx (line 391)
- Added `border` class to editCategory select in RulesPage.tsx (line 406)

---

### WR-02: Replace Frontend alert() with Toast Notifications
**Status:** DONE
**Severity:** HIGH

**Problem:** Multiple pages use browser `alert()` for error handling - poor UX.

**Files Affected:**
- `frontend/src/pages/TransactionsPage.tsx:238, 273-274`
- `frontend/src/pages/RulesPage.tsx:110-112`

**Acceptance Criteria:**
- [x] All alert() calls replaced with toast notifications
- [x] Toast component (already exists) used properly

**Implementation Notes:**
- Imported `useToast` hook in TransactionsPage.tsx
- Added `addToast` hook call at component level
- Replaced `alert()` in `handleCategoryChange` error handler with `addToast('error', message)`
- Replaced `alert()` in `handleExport` error handler with `addToast('error', message)`
- Note: RulesPage.tsx already used `setError()` pattern (no alert() calls found)
- Files changed: `frontend/src/pages/TransactionsPage.tsx`

---

## Work Items - Testing

### WR-03: Add Frontend Component Unit Tests
**Status:** DONE
**Severity:** HIGH

**Problem:** Frontend has 0% component test coverage. Only 2 trivial tests exist.

**Files Needing Tests:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/pages/RulesPage.tsx`
- `frontend/src/pages/UploadPage.tsx`
- `frontend/src/components/DateRangePicker.tsx`
- `frontend/src/api/client.ts`

**Acceptance Criteria:**
- [x] @testing-library/react installed
- [x] vitest.config.ts with jsdom environment
- [x] Tests for all pages: rendering, user interactions, API states
- [x] 80%+ coverage target

**Implementation Notes:**
- Installed @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, @vitest/coverage-v8
- Updated vitest.config.ts with coverage configuration and thresholds
- Created tests/setup.ts with jsdom mocks (ResizeObserver, canvas, matchMedia, URL)
- Added comprehensive tests for api/client.ts (23 tests covering GET/POST/PATCH/DELETE/upload/download)
- Added tests for components: DateRangePicker, Toast, LoadingSpinner, ErrorMessage, Sidebar, PageLoading
- Added tests for all pages: DashboardPage, TransactionsPage, RulesPage, UploadPage
- Coverage achieved: 96.58% statements, 88.24% branches, 81.25% functions, 96.58% lines
- Files created: tests/setup.ts, tests/api/client.test.ts, tests/components/*.test.tsx, tests/pages/*.test.tsx

---

### WR-04: Add Vitest Configuration Files
**Status:** DONE
**Severity:** HIGH

**Problem:** No explicit `vitest.config.ts` files - tests rely on defaults.

**Files to Create:**
- `backend/vitest.config.ts`
- `frontend/vitest.config.ts`

**Acceptance Criteria:**
- [x] Backend config: node environment, isolation
- [x] Frontend config: jsdom environment, coverage
- [x] Coverage thresholds set (70% minimum)

**Implementation Notes:**
- Updated `backend/vitest.config.ts` with `isolate: true` and `pool: 'forks'` for test isolation
- Added coverage configuration to backend: v8 provider, 70% thresholds, reporter output
- Frontend config already had jsdom environment, coverage thresholds (80%), and full configuration
- Installed `@vitest/coverage-v8` in backend for coverage support
- All 202 backend tests pass with isolation
- All 156 frontend tests pass with coverage thresholds

---

### WR-05: Fix E2E Test Performance
**Status:** DONE
**Severity:** HIGH

**Problem:** E2E tests run sequentially with single worker, taking 2+ minutes.

**File:** `e2e/playwright.config.ts`

**Current Config:**
```typescript
fullyParallel: false,
workers: 1,
```

**Acceptance Criteria:**
- [x] Database isolation for parallel tests
- [x] Workers increased (4+ or CPU cores)
- [x] E2E suite runs in <30 seconds

**Implementation Notes:**
- Created `e2e/global-setup.ts` to prepare dedicated E2E test database directory
- Created `e2e/global-teardown.ts` for cleanup after test runs
- Updated `e2e/playwright.config.ts` with workers set to '50%' (local) or 4 (CI)
- Added globalSetup and globalTeardown configuration
- Database isolation via separate `backend/data/e2e/test.db` path
- Reduced timeouts for faster feedback (30s test, 5s expect, 10s action)
- Tests run using 5 workers in parallel, completing in ~13 seconds
- Files changed: `e2e/playwright.config.ts`, `e2e/global-setup.ts`, `e2e/global-teardown.ts`

---

### WR-06: Add Integration Tests for API Endpoints
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Backend routes tested via SQL queries, not HTTP endpoint tests.

**Acceptance Criteria:**
- [x] supertest library installed
- [x] HTTP endpoint tests for all routes
- [x] Request/response validation

**Implementation Notes:**
- Installed `supertest` and `@types/supertest` in backend devDependencies
- Created `backend/src/app.ts` to export Express app without starting server (for testability)
- Refactored `backend/src/index.ts` to import app and start server
- Created comprehensive integration test file: `backend/tests/integration/api.test.ts`
- Tests cover all API endpoints: health, transactions, categories, rules, export
- Includes request validation tests (missing fields, invalid values, 404s, etc.)

---

### WR-07: Add Test Fixtures and Factories
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Tests create data inline with duplication.

**Acceptance Criteria:**
- [x] Transaction, Category, Rule factories
- [x] Database seeding utilities
- [x] Consistent test data across suites

**Implementation Notes:**
- Created `backend/tests/fixtures/` with factories.ts and seeders.ts
- Backend factories: createTransaction, createCategory, createRule, preset helpers (groceryTransaction, transportTransaction, etc.)
- Backend seeders: seedStandardTestData, seedUncategorizedTransactions, seedRuleForCategory, getCategoryId, and query helpers
- Created `frontend/tests/fixtures/` with factories.ts and mockData.ts
- Frontend factories: createMockTransaction, createMockCategory, createMockRule with preset helpers
- Frontend mockData: standardTransactionsResponse, standardCategoriesResponse, standardRulesResponse for consistent mock data
- Updated transactions.test.ts, categories.test.ts, rules.test.ts, api.test.ts to use new fixtures
- Updated TransactionsPage.test.tsx and RulesPage.test.tsx to use new fixtures

---

## Work Items - Code Quality

### WR-08: Extract Duplicated Query Building Logic
**Status:** DONE
**Severity:** MEDIUM

**Problem:** WHERE clause building duplicated across 3+ files.

**Files Affected:**
- `backend/src/routes/transactions.ts:45-80, 138-164`
- `backend/src/routes/export.ts:44-84`

**Acceptance Criteria:**
- [x] Shared utility `buildTransactionWhereClause(query)` created
- [x] All routes use shared utility
- [x] Unit tests for utility

**Implementation Notes:**
- Created `backend/src/utils/queryBuilder.ts` with `buildTransactionWhereClause` function and TypeScript interfaces
- Updated `backend/src/routes/transactions.ts` GET `/` route to use shared utility
- Updated `backend/src/routes/transactions.ts` GET `/stats` route to use shared utility
- Updated `backend/src/routes/export.ts` to import shared utility and removed local duplicate function
- Created `backend/tests/queryBuilder.test.ts` with 16 unit tests covering all filter combinations
- All 430 tests pass (274 backend + 156 frontend)

---

### WR-09: Standardize Error Response Format
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Inconsistent error response formats across endpoints.

**Acceptance Criteria:**
- [x] Standard format: `{ success: false, error: { code, message, details? } }`
- [x] All endpoints use consistent format
- [x] Frontend handles standard format

**Implementation Notes:**
- Created `StandardErrorResponse` interface and `ErrorCodes` constants in `backend/src/middleware/errorHandler.ts`
- Added `createErrorResponse()` utility function for consistent error formatting
- Updated `AppError` class to include error code, added `ConflictError` class
- Updated all routes (transactions, categories, rules, export) to use `createErrorResponse()`
- Updated frontend `api/client.ts` to parse both standard and legacy error formats
- Updated integration tests to expect new standard error response format
- Files changed: `backend/src/middleware/errorHandler.ts`, `backend/src/routes/*.ts`, `frontend/src/api/client.ts`, `backend/tests/integration/api.test.ts`

---

### WR-10: Add Input Validation Middleware
**Status:** DONE
**Severity:** MEDIUM

**Problem:** ID parameters and query filters cast directly without validation.

**Files Affected:**
- `backend/src/routes/transactions.ts:267`
- `backend/src/routes/categories.ts:59`
- `backend/src/routes/rules.ts:119`

**Acceptance Criteria:**
- [x] Centralized validation using Zod or express-validator
- [x] All ID parameters validated as positive integers
- [x] Validation errors return 400 with details

**Implementation Notes:**
- Installed Zod validation library in backend
- Created `backend/src/middleware/validation.ts` with centralized validation schemas and middleware
- Added `validateIdParam` middleware to all routes with `:id` parameter (transactions, categories, rules)
- Validation returns 400 with `{ success: false, error: { code: 'VALIDATION_ERROR', message, details } }` format
- Created comprehensive unit tests in `backend/tests/validation.test.ts` (30 tests)
- Added integration tests for invalid ID validation in `backend/tests/integration/api.test.ts`

---

### WR-11: Add Environment Configuration
**Status:** DONE
**Severity:** MEDIUM

**Problem:** No `.env.example` file or documentation.

**Required Variables:**
- `NODE_ENV`, `PORT`, `DB_PATH`, `ALLOWED_ORIGINS`, `LOG_LEVEL`

**Acceptance Criteria:**
- [x] `.env.example` created
- [x] README documents environment setup
- [x] Defaults work for development

**Implementation Notes:**
- Created `.env.example` with all required environment variables and documentation
- Variables include: NODE_ENV, PORT, DB_PATH, ALLOWED_ORIGINS, LOG_LEVEL
- Each variable has sensible development defaults (no configuration needed for dev)
- Updated README.md with Environment Configuration section including variable table
- Notes in .env.example reference related work items (WR-12 for CORS, WR-25 for structured logging)
- Files changed: `.env.example`, `README.md`

---

## Work Items - Security Hardening

### WR-12: Fix CORS Configuration
**Status:** DONE
**Severity:** MEDIUM

**Problem:** `app.use(cors())` allows all origins. Less critical for personal use but good practice.

**File:** `backend/src/index.ts:14`

**Acceptance Criteria:**
- [x] CORS restricted to localhost by default
- [x] Configurable via environment variable

**Implementation Notes:**
- Added `getAllowedOrigins()` function in `backend/src/app.ts` to parse `ALLOWED_ORIGINS` env var
- Default origins: `http://localhost:3000` and `http://localhost:5173` (both common frontend dev servers)
- CORS config uses origin callback to validate requests against allowed list
- Requests with no origin (same-origin, curl, Postman) are allowed for development convenience
- Updated `.env.example` to reflect implementation and remove "not implemented" note
- Files changed: `backend/src/app.ts`, `.env.example`

---

### WR-13: Secure Database File Permissions
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Database directory created with default permissions.

**File:** `backend/src/db/database.ts:25-27`

**Acceptance Criteria:**
- [x] Directory created with 700 permissions

**Implementation Notes:**
- Updated `ensureDataDir()` function in `backend/src/db/database.ts`
- Added `mode: 0o700` option to `fs.mkdirSync()` call
- 700 permissions = owner read/write/execute only (rwx------), no access for group or others
- All 465 tests pass (309 backend + 156 frontend)
- Files changed: `backend/src/db/database.ts`

---

### WR-14: Add Rate Limiting
**Status:** DONE
**Severity:** LOW

**Problem:** No rate limiting - could be abused if exposed.

**Acceptance Criteria:**
- [x] express-rate-limit installed
- [x] Upload endpoint limited (10/min)
- [x] API endpoints limited (100/min)

**Implementation Notes:**
- Installed `express-rate-limit` package in backend
- Created `backend/src/middleware/rateLimit.ts` with two rate limiters
- `uploadLimiter`: 10 requests per minute for resource-intensive uploads
- `apiLimiter`: 100 requests per minute for general API endpoints
- Rate limit responses use standard error format with `RATE_LIMIT_EXCEEDED` code
- Files changed: `backend/src/middleware/rateLimit.ts`, `backend/src/app.ts`, `backend/package.json`

---

## Work Items - Performance

### WR-15: Optimize Rule Application Logic
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Rules application uses O(n*m) nested loop.

**File:** `backend/src/routes/rules.ts:273-286`

**Acceptance Criteria:**
- [x] Bulk UPDATE statement instead of loop
- [x] Performance tested with 1000+ transactions

**Implementation Notes:**
- Replaced O(n*m) nested loop with single bulk UPDATE SQL statement
- Subquery finds first matching rule (by keyword ASC) preserving original "first matching rule" behavior
- Uses EXISTS clause to only update transactions that have a matching rule
- Added performance test: 1500 transactions + 10 rules categorized in ~8ms
- Files changed: `backend/src/routes/rules.ts`, `backend/tests/rules.test.ts`

---

### WR-16: Add Streaming for Large Exports
**Status:** DONE
**Severity:** MEDIUM

**Problem:** CSV export builds entire string in memory.

**File:** `backend/src/routes/export.ts:145-156`

**Acceptance Criteria:**
- [x] Streaming response for >1000 rows
- [x] Memory usage bounded

**Implementation Notes:**
- Added `STREAMING_THRESHOLD` constant (1000 rows) to determine when to use streaming
- For datasets >1000 rows, uses `res.write()` to stream CSV rows directly to response
- For smaller datasets, keeps in-memory approach (faster for small exports)
- Added integration tests verifying streaming with 1100+ and 1500+ transactions
- Memory test confirms bounded memory usage during large exports
- Files changed: `backend/src/routes/export.ts`, `backend/tests/integration/api.test.ts`

---

### WR-17: Memoize Chart Options
**Status:** DONE
**Severity:** LOW

**Problem:** Chart options recreated on every render.

**File:** `frontend/src/pages/DashboardPage.tsx:195-260`

**Acceptance Criteria:**
- [x] Options wrapped in useMemo

**Implementation Notes:**
- Wrapped `pieOptions` in `useMemo` with empty dependency array (lines 207-222)
- Wrapped `barOptions` in `useMemo` with empty dependency array (lines 224-247)
- Wrapped `lineOptions` in `useMemo` with empty dependency array (lines 249-272)
- `formatCurrency` is defined outside component scope, so no dependencies needed
- Files changed: `frontend/src/pages/DashboardPage.tsx`

---

## Work Items - Database

### WR-18: Add Case-Insensitive Unique Constraint
**Status:** DONE
**Severity:** LOW

**Problem:** Category name uniqueness is case-sensitive at DB level but case-insensitive in app.

**File:** `backend/src/db/database.ts:35`

**Acceptance Criteria:**
- [x] UNIQUE constraint uses COLLATE NOCASE

**Implementation Notes:**
- Updated CREATE TABLE statement for categories table in `backend/src/db/database.ts`
- Added `COLLATE NOCASE` to the name column definition: `name TEXT NOT NULL UNIQUE COLLATE NOCASE`
- This enforces case-insensitive uniqueness at the database level for new databases
- Existing application-level checks using `LOWER()` remain as defense-in-depth
- All 468 tests pass (312 backend + 156 frontend)
- Files changed: `backend/src/db/database.ts`

---

### WR-19: Add Database Constraints
**Status:** DONE
**Severity:** LOW

**Problem:** Database has minimal CHECK constraints.

**Acceptance Criteria:**
- [x] Date format validation
- [x] Name/keyword NOT EMPTY
- [x] Color format validation

**Implementation Notes:**
- Added date format CHECK constraint to `transactions.date`: validates YYYY-MM-DD pattern using GLOB
- Added NOT EMPTY CHECK constraint to `categories.name`: uses `length(trim(name)) > 0`
- Added NOT EMPTY CHECK constraint to `category_rules.keyword`: uses `length(trim(keyword)) > 0`
- Added hex color format CHECK constraint to `categories.color`: validates #RRGGBB format using GLOB
- Added 8 unit tests covering valid/invalid inputs for all new constraints
- Files changed: `backend/src/db/database.ts`, `backend/tests/database.test.ts`

---

## Work Items - Accessibility

### WR-20: Add Proper Form Labels
**Status:** DONE
**Severity:** MEDIUM

**Problem:** Input fields missing `<label>` associations.

**Acceptance Criteria:**
- [x] All inputs have associated labels
- [x] Labels use htmlFor attribute

**Implementation Notes:**
- Added `<label>` with `htmlFor` and `id` to search input in TransactionsPage.tsx (line 340-345)
- Added `<label>` with `htmlFor` and `id` to inline category select in TransactionsPage.tsx (line 499-503)
- Added `<label>` with `htmlFor` and `id` to edit keyword input in RulesPage.tsx (line 388-393)
- Added `<label>` with `htmlFor` and `id` to edit category select in RulesPage.tsx (line 408-412)
- Added `<label>` with `htmlFor` and `id` to hidden file input in UploadPage.tsx (line 250-256)
- All labels use `sr-only` class to be visually hidden but accessible to screen readers

---

### WR-21: Add ARIA Labels
**Status:** DONE
**Severity:** LOW

**Problem:** Sortable headers, date picker missing ARIA attributes.

**Acceptance Criteria:**
- [x] Sortable headers have aria-sort
- [x] Date picker has aria-label

**Implementation Notes:**
- Added `aria-sort` attribute to all sortable table headers in TransactionsPage.tsx (date, description, amount, bank)
- `aria-sort` dynamically set to "ascending" or "descending" based on current sort column and order
- Added `aria-label="Select date range"` to DateRangePicker trigger button
- Updated DateRangePicker tests to use new aria-label for button selection
- Files changed: `frontend/src/pages/TransactionsPage.tsx`, `frontend/src/components/DateRangePicker.tsx`, `frontend/tests/components/DateRangePicker.test.tsx`

---

## Work Items - Infrastructure

### WR-22: Add ESLint Configuration
**Status:** NOT IMPLEMENTED
**Severity:** MEDIUM

**Problem:** npm lint scripts exist but no `.eslintrc` found.

**Acceptance Criteria:**
- [ ] `.eslintrc.js` with TypeScript rules
- [ ] @typescript-eslint configured

---

### WR-23: Add Prettier Configuration
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Acceptance Criteria:**
- [ ] `.prettierrc` created
- [ ] Format script in package.json

---

### WR-24: Fix TypeScript Configuration Inconsistencies
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Three tsconfig files have conflicting settings.

**Acceptance Criteria:**
- [ ] Consistent target across packages
- [ ] Build outputs consistent

---

### WR-25: Add Structured Logging
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Problem:** Errors logged to console only.

**Acceptance Criteria:**
- [ ] Logger with configurable levels
- [ ] File logging option

---

### WR-26: Improve Health Check Endpoint
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Acceptance Criteria:**
- [ ] Health checks database connectivity
- [ ] Returns version information

---

### WR-27: Add API Documentation
**Status:** NOT IMPLEMENTED
**Severity:** LOW

**Acceptance Criteria:**
- [ ] OpenAPI 3.0 specification
- [ ] Swagger UI at /api-docs

---

## Priority Summary

### P0 - Critical (Fix First)
1. **WR-01:** Fix Input Borders (users can't see form fields!)
2. **WR-02:** Replace alert() with Toast
3. **WR-03:** Frontend Component Tests (0% coverage)

### P1 - High Priority
4. **WR-04:** Vitest Configuration
5. **WR-05:** E2E Test Performance
6. **WR-08:** Extract Query Logic
7. **WR-09:** Standardize Errors
8. **WR-10:** Input Validation

### P2 - Medium Priority
9. **WR-06:** API Integration Tests
10. **WR-07:** Test Fixtures
11. **WR-11:** Environment Config
12. **WR-12:** CORS Config
13. **WR-15:** Rule Application Performance
14. **WR-20:** Form Labels
15. **WR-22:** ESLint Config

### P3 - Lower Priority
16-27: Database constraints, accessibility polish, infrastructure improvements

---

## Verification

After implementing:

1. **Visual Check:**
   - All form fields visible and usable
   - No browser alerts appear

2. **Test Coverage:**
   ```bash
   npm run test -- --coverage
   # Target: 70%+ coverage
   ```

3. **E2E Performance:**
   ```bash
   time npm run test:e2e
   # Target: <30 seconds
   ```

4. **Build Check:**
   ```bash
   npm run build
   npm start
   # All features work
   ```
