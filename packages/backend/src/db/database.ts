import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/database.sqlite';

// Garantir que o diretório existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDatabase() {
  console.log('📦 Initializing database...');

  // Tabela de contas bancárias conectadas
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT,
      iban TEXT,
      account_type TEXT,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at INTEGER,
      consent_id TEXT,
      consent_expires_at INTEGER,
      connected_at INTEGER NOT NULL,
      last_sync_at INTEGER,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Tabela de transações
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      transaction_id TEXT,
      date INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      description TEXT,
      merchant TEXT,
      category TEXT,
      type TEXT NOT NULL,
      balance_after REAL,
      reference TEXT,
      status TEXT DEFAULT 'completed',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
    )
  `);

  // Tabela de categorias personalizadas
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      keywords TEXT,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Índices para performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_account_date
    ON transactions(account_id, date DESC);

    CREATE INDEX IF NOT EXISTS idx_transactions_category
    ON transactions(category);

    CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON transactions(date DESC);

    CREATE INDEX IF NOT EXISTS idx_bank_accounts_user
    ON bank_accounts(user_id);
  `);

  console.log('✅ Database initialized successfully');
}

export default db;
