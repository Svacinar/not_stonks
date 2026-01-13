import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function getDbPath(): string {
  return process.env.DB_PATH || path.join(__dirname, '../../data/spending.db');
}

let db: Database.Database | null = null;
let currentDbPath: string | null = null;

const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#22c55e' },
  { name: 'Transport', color: '#3b82f6' },
  { name: 'Shopping', color: '#f59e0b' },
  { name: 'Entertainment', color: '#8b5cf6' },
  { name: 'Health', color: '#ef4444' },
  { name: 'Utilities', color: '#06b6d4' },
  { name: 'Finance', color: '#64748b' },
  { name: 'Other', color: '#9ca3af' },
];

function ensureDataDir(dbPath: string): void {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    // Create with 700 permissions (owner read/write/execute only) for security
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  }
}

function createTables(database: Database.Database): void {
  database.exec(`
    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      color TEXT NOT NULL
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      bank TEXT NOT NULL CHECK (bank IN ('CSOB', 'Raiffeisen', 'Revolut')),
      category_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Category rules table
    CREATE TABLE IF NOT EXISTS category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- Upload log table
    CREATE TABLE IF NOT EXISTS upload_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      bank TEXT NOT NULL CHECK (bank IN ('CSOB', 'Raiffeisen', 'Revolut')),
      transaction_count INTEGER NOT NULL,
      upload_date TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date_bank ON transactions(date, bank);
    CREATE INDEX IF NOT EXISTS idx_category_rules_keyword ON category_rules(keyword);
  `);
}

function seedDefaultCategories(database: Database.Database): void {
  const existingCount = database.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };

  if (existingCount.count === 0) {
    const insert = database.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    const insertMany = database.transaction((categories: typeof DEFAULT_CATEGORIES) => {
      for (const category of categories) {
        insert.run(category.name, category.color);
      }
    });
    insertMany(DEFAULT_CATEGORIES);
  }
}

export function getDatabase(): Database.Database {
  const dbPath = getDbPath();
  if (!db || currentDbPath !== dbPath) {
    if (db) {
      db.close();
    }
    ensureDataDir(dbPath);
    db = new Database(dbPath);
    currentDbPath = dbPath;
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    createTables(db);
    seedDefaultCategories(db);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    currentDbPath = null;
  }
}

export function resetDatabase(): void {
  const dbPath = getDbPath();
  closeDatabase();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  }
}

export { getDbPath, DEFAULT_CATEGORIES };
