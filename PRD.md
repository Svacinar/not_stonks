# Bank Statement Consolidation & Intelligent Categorization System

## Executive Summary

A personal finance system that consolidates bank statements from 3 different banks (CSOB, Raiffeisen, Revolut) into a single unified view with automatic transaction categorization using keyword/rule-based matching. Includes a web GUI for easy data upload, analysis, and insights, with SQLite database persistence.

**Problem:** User has accounts at 3 different banks and can't see spending patterns across them. Revolut's "linked accounts" feature is unavailable for Czech banks. Manual categorization is time-consuming. No clear visibility into spending across banks.

**Solution:** Web-based system that allows users to upload statements, automatically merges them, intelligently categorizes transactions, and displays comprehensive spending analysis through an interactive dashboard. All data persisted locally in SQLite.

---

## Use Cases

### Use Case 1: Upload Bank Statements via Web Interface
**Actor:** User (monthly)

**Goal:** Upload CSV/Excel files from 3 banks through web browser without command-line interaction

**Flow:**
1. User opens web browser, visits dashboard
2. User clicks "Upload Statements" button
3. User selects CSV files from CSOB, Raiffeisen, Revolut
4. Backend automatically detects bank type (CSOB/Raiffeisen/Revolut) from file
5. Statements are parsed, consolidated, categorized, and saved to database
6. Success message displayed with transaction count

**Expected Outcome:**
- Drag-and-drop or file browser upload interface
- Visual feedback during processing (loading spinner)
- Success confirmation with summary (e.g., "Imported 145 new transactions from 3 banks")
- No manual scripting or terminal required

---

### Use Case 2: View Consolidated Spending Dashboard
**Actor:** User (weekly/daily)

**Goal:** See overview of all spending across 3 banks at a glance

**Flow:**
1. User opens dashboard after uploading statements
2. Dashboard displays:
   - Total spending by category (interactive pie/bar chart)
   - Total spending by bank (side-by-side comparison)
   - Recent transactions (list view)
   - Key metrics (total spent, avg transaction, largest expense)
   - Date range covered

**Expected Outcome:**
- Interactive charts (pie charts, bar charts, line graphs)
- Color-coded by category and bank
- Summary cards with key metrics
- Data automatically updates after each upload
- Charts are responsive and work on desktop/tablet

**Example Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│ Bank Statement Dashboard                    📊 📈   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ QUICK STATS (Date: Dec 1 - Jan 15)                 │
│ ┌──────────┬──────────┬──────────┬──────────┐     │
│ │ Total    │ Avg per  │ Largest  │ # of     │     │
│ │ Spending │ Txn      │ Expense  │ Trans    │     │
│ │ $8,900   │ $19.78   │ $2,500   │ 450      │     │
│ └──────────┴──────────┴──────────┴──────────┘     │
│                                                     │
│ SPENDING BY CATEGORY          SPENDING BY BANK     │
│ ┌──────────────────────┐    ┌──────────────────┐  │
│ │ 🍔 Food: $1,250      │    │ CSOB:  $2,800    │  │
│ │ 🛍️ Shopping: $3,100  │    │ Raiff: $2,100    │  │
│ │ 💸 Finance: $2,200   │    │ Revolut: $4,000  │  │
│ │ 🚗 Transport: $890   │    └──────────────────┘  │
│ │ 🎬 Entertain: $450   │                          │
│ │ 🏥 Health: $280      │                          │
│ │ 💡 Utilities: $320   │                          │
│ │ 📱 Other: $610       │                          │
│ └──────────────────────┘                          │
│                                                     │
│ RECENT TRANSACTIONS                                │
│ ┌──────────┬────────┬─────────────────┬─────────┐ │
│ │ Date     │ Amount │ Description     │ Category│ │
│ ├──────────┼────────┼─────────────────┼─────────┤ │
│ │ Jan 15   │ $45.50 │ STARBUCKS CAFE  │ Food  ✓ │ │
│ │ Jan 14   │ $120   │ SHELL GAS       │ Trans ✓ │ │
│ │ Jan 13   │ $89.99 │ NETFLIX         │ Ent   ✓ │ │
│ │ Jan 12   │ $450   │ IKEA PRAHA      │ Shop  ? │ │
│ └──────────┴────────┴─────────────────┴─────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Use Case 3: Automatic Transaction Categorization
**Actor:** User (one-time setup + monthly review)

**Goal:** Automatically assign categories to transactions via keyword/rule-based matching

**Flow:**

**Initial Setup:**
1. User uploads first batch of statements
2. System creates initial categories from Revolut data (Revolut already has categories)
3. System applies keyword rules to categorize transactions (e.g., "STARBUCKS" → Food, "SHELL" → Transport)
4. Uncategorized transactions are flagged for manual review
5. User categorizes flagged transactions via web interface
   - Click on transaction row → shows category dropdown
   - Select category → saves to database
   - System learns new keyword → category mappings from user choices

**Monthly Review:**
1. User uploads new statements
2. System automatically categorizes using keyword rules
3. Uncategorized transactions shown in "Needs Review" section
4. User assigns categories to new merchants
5. Keyword rules automatically expand based on user assignments

**Expected Outcome:**
- Categorization interface integrated into dashboard
- Visual indicators (✓ categorized, ? needs review)
- Inline editing (click to change category)
- System learns merchant → category mappings over time
- Simple keyword-based rules (no ML complexity)

---

### Use Case 4: Spending Analysis & Insights
**Actor:** User (on-demand exploration)

**Goal:** Deep dive into spending patterns with filters and drill-down

**Flow:**
1. User clicks "Analysis" tab on dashboard
2. Selectable filters appear:
   - **Date range picker** (calendar or preset: "Last Month", "Last Quarter", etc.)
   - **Bank filter** (checkbox: CSOB, Raiffeisen, Revolut)
   - **Category filter** (checkbox: Food, Transport, etc.)
   - **Amount range slider** (min-max)

3. Charts update dynamically as filters change
4. Available analyses:
   - **Spending over time** (line chart by month/week)
   - **Category breakdown** (pie chart with percentages)
   - **Bank comparison** (grouped bar chart)
   - **Top merchants** (table: "Which stores/places did I spend most at?")
   - **Transaction trend** (table: spending increasing/decreasing?)

**Expected Outcome:**
- Interactive filters that update visualizations in real-time
- Export capability (download filtered results as CSV)
- Trend indicators (🔴 up, 🟢 down, ➡️ stable)
- Drill-down capability (click category → see all transactions in that category)

**Example Insights:**
```
Insights (Jan 1 - Jan 15):
✓ Transport spending DOWN 15% vs previous month
✗ Shopping spending UP 25% vs previous month
→ Salary stable (as expected)
✓ Food spending DOWN 8% (good work!)
```

---

### Use Case 5: Manage Categorization Rules
**Actor:** User (optional)

**Goal:** View and manage keyword → category mappings

**Flow:**
1. User clicks "Rules" or "Settings" in the dashboard
2. System displays list of learned keyword rules:
   - "STARBUCKS" → Food
   - "SHELL" → Transport
   - "NETFLIX" → Entertainment
3. User can:
   - Edit existing rules (change category)
   - Delete rules (remove mapping)
   - Add new rules manually
4. Changes apply to future categorization

**Expected Outcome:**
- Simple table view of all keyword rules
- Inline editing of rules
- Rules persist in database
- Clear overview of how categorization works

---

### Use Case 6: Export Data for External Use
**Actor:** User (occasional)

**Goal:** Export consolidated and categorized data for use in Excel, accounting software, etc.

**Flow:**
1. User clicks "Export" button on dashboard
2. Export options appear:
   - **Full dataset** (all transactions, all categories)
   - **Filtered data** (based on current dashboard filters)
   - **Summary report** (spending by category, month, bank)
3. Format options:
   - CSV (for Excel, spreadsheets)
   - JSON (for data analysis tools)
4. User clicks "Download"
5. File downloads as `consolidated_statements_[date].csv`

**Expected Outcome:**
- One-click export without database knowledge
- Multiple format options
- Exported data is clean and ready for external use
- No data corruption or formatting issues

---

## Architecture

### System Components

**1. Backend**
- Node.js with Express or Fastify
- Keyword-based categorization engine
- Statement parsing & consolidation logic (CSV/Excel parsing)
- SQLite database interface
- REST API endpoints

**2. Frontend**
- Web-based GUI (HTML/CSS/JavaScript)
- Interactive charts (Chart.js or similar)
- Data upload interface (drag-and-drop)
- Dashboard with visualizations
- Analysis/filter interface

**3. Database**
- SQLite database (file-based, zero setup)
- Tables:
  - `transactions` (id, date, amount, description, bank, category_id)
  - `categories` (id, name, color)
  - `category_rules` (id, keyword, category_id) - learned merchant → category mappings
  - `upload_log` (id, filename, bank, transaction_count, upload_date)

### Data Flow
```
1. User uploads statements via web form
   ↓
2. Backend detects file type (CSOB/Raiffeisen/Revolut)
   ↓
3. Backend parses CSV/Excel
   ↓
4. Backend consolidates with existing data (deduplication)
   ↓
5. Keyword rules applied to categorize transactions
   ↓
6. Data inserted into SQLite database
   ↓
7. Frontend queries database and displays dashboard
   ↓
8. User reviews and categorizes uncategorized transactions
   ↓
9. New keyword rules learned from user assignments
```

---

## Data Requirements

### Input Data

**CSOB Bank Statements:**
- Format: CSV
- Encoding: Windows-1250 or UTF-8
- Columns: Date, Amount, Description
- Can upload multiple files at once
- System auto-detects as CSOB

**Raiffeisen Bank Statements:**
- Format: CSV
- Encoding: Windows-1250 or UTF-8
- Columns: Datum, Částka, Popis (system handles Czech column names)
- Can upload multiple files at once
- System auto-detects as Raiffeisen

**Revolut Statements:**
- Format: Excel (.xlsx) or CSV
- Columns: Completed Date, Amount, Description
- Can upload multiple files at once
- System auto-detects as Revolut

### Database Schema

**transactions table:**
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  bank TEXT NOT NULL,  -- CSOB, Raiffeisen, Revolut
  category_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);
```

**categories table:**
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,  -- Food, Transport, etc.
  color TEXT  -- for visualization (hex code)
);
```

**category_rules table:**
```sql
CREATE TABLE category_rules (
  id INTEGER PRIMARY KEY,
  keyword TEXT NOT NULL,  -- e.g., "STARBUCKS", "SHELL"
  category_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);
```

**upload_log table:**
```sql
CREATE TABLE upload_log (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,
  bank TEXT NOT NULL,
  transaction_count INTEGER,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Non-Functional Requirements

### Performance
- **File upload:** Handle files < 5MB, complete in < 10 seconds
- **Consolidation:** < 30 seconds for 3-6 months of statements
- **Dashboard load:** < 2 seconds
- **Full workflow:** < 2 minutes total (upload to dashboard view)
- **Database queries:** < 500ms for any dashboard query

### Accuracy
- **Duplicate detection:** 100% accuracy
- **Categorization:** Keyword rules match known merchants accurately
- **Data integrity:** Zero corruption, zero data loss

### Usability
- **Initial setup:** < 1 hour (mostly manual labeling via web UI)
- **Monthly maintenance:** < 15 minutes
- **No command-line required:** Everything via web GUI
- **No technical knowledge:** Non-developers should understand all features
- **Mobile-friendly:** Dashboard should work on tablet/phone (responsive design)

### Privacy & Security
- **No cloud upload:** All data stays on user's machine
- **No external dependencies:** Works offline
- **SQLite storage:** Data in single file, easy to backup
- **No user tracking:** No analytics, no telemetry
- **Single-user:** No authentication needed (local only)

### Reliability
- **Auto-recovery:** If app crashes, data persisted in database
- **Concurrent uploads:** Handle multiple file uploads gracefully
- **Encoding handling:** Correctly parse CSV files with different encodings
- **Error messages:** User-friendly error messages for common issues

---

## Scope

### In Scope
✅ Web GUI for statement upload
✅ Dashboard with interactive visualizations
✅ Automatic transaction categorization (keyword/rule-based)
✅ Manual categorization via UI
✅ SQLite database persistence
✅ Multi-bank consolidation
✅ Spending analysis & insights
✅ Charts (pie, bar, line graphs)
✅ Filtering & drill-down capabilities
✅ Export data (CSV, JSON)
✅ Categorization rules management
✅ Monthly workflow (upload → categorize → analyze)

### Out of Scope
❌ Machine learning / AI categorization
❌ Real-time bank API connections
❌ Mobile app (web GUI is sufficient)
❌ Multi-user authentication
❌ Cloud deployment or hosting
❌ Budget forecasting or predictions
❌ Investment tracking
❌ Tax report generation
❌ Integration with external software
❌ Cloud backup/sync
❌ Cryptocurrency or stocks

---

## Success Metrics

**Primary Metrics:**
1. **Data Consolidation:** 100% of transactions from 3 banks merged without loss
2. **Categorization Coverage:** Most recurring merchants auto-categorized after initial setup
3. **User Experience:** No command-line required, all via web GUI
4. **Setup Time:** Initial setup < 30 minutes
5. **Monthly Maintenance:** < 15 minutes

**Secondary Metrics:**
1. **Dashboard Performance:** Load in < 2 seconds
2. **Rule Growth:** Keyword rules expand naturally with usage
3. **Data Quality:** Zero duplicates, zero corruption
4. **Database Size:** < 50MB for 1 year of transactions

---

## Technical Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express or Fastify
- **Database:** SQLite via better-sqlite3 or sql.js
- **Parsing:** csv-parse, xlsx (for Excel files)

### Frontend
- **Framework:** React or Vue (or vanilla JS)
- **Charts:** Chart.js (interactive, responsive)
- **Styling:** Tailwind CSS or similar
- **Build:** Vite

### Deployment
- **Development:** npm run dev (hot reload)
- **Production:** npm run build + npm start
- **Database:** SQLite file in project directory
- **Port:** localhost:3000 or similar

---

## Timeline & Deliverables

**Phase 1: Project Setup & Backend Foundation**
- Deliverable: Node.js server, SQLite schema, API structure
- Features: Statement parsing, consolidation, database CRUD

**Phase 2: Frontend Dashboard**
- Deliverable: Web GUI with basic visualizations
- Features: Upload form, transaction table, basic charts

**Phase 3: Categorization System**
- Deliverable: Keyword-based categorization
- Features: Auto-categorization, manual assignment, rule management

**Phase 4: Analysis & Insights**
- Deliverable: Advanced dashboard features
- Features: Filters, drill-down, trend analysis, export

**Phase 5: Testing & Polish**
- Deliverable: Bug fixes, error handling, final touches
- Features: Edge cases, responsiveness, documentation

---

## Key Features Summary

| Feature | Priority | Complexity |
|---------|----------|-----------|
| Statement upload (web) | High | Low |
| Bank auto-detection | High | Low |
| Dashboard with charts | High | Medium |
| Keyword categorization | High | Low |
| Manual categorization | High | Low |
| Rules management | Medium | Low |
| Analysis filters | Medium | Medium |
| Export data | Medium | Low |
| Error handling | High | Low |
