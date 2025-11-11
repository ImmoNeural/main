-- Migration: Add optimized indexes for incremental sync
-- Purpose: Optimize duplicate checking and historical data queries
-- Date: 2025-11-10

-- ==========================================
-- 1. Add composite index for duplicate detection
-- ==========================================
-- This index speeds up the duplicate check: (account_id + transaction_id)
-- Used when checking if a transaction already exists
CREATE INDEX IF NOT EXISTS idx_transactions_account_transaction
ON transactions(account_id, transaction_id);

-- ==========================================
-- 2. Add index for date-based queries
-- ==========================================
-- This index speeds up queries filtering by date range
-- Used for incremental sync and date-filtered reports
CREATE INDEX IF NOT EXISTS idx_transactions_account_date
ON transactions(account_id, date DESC);

-- ==========================================
-- 3. Add index for user-based account queries
-- ==========================================
-- This index speeds up fetching all accounts for a user
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_status
ON bank_accounts(user_id, status);

-- ==========================================
-- 4. Add index for sync tracking
-- ==========================================
-- This index helps find accounts that need syncing
CREATE INDEX IF NOT EXISTS idx_bank_accounts_last_sync
ON bank_accounts(user_id, last_sync_at DESC)
WHERE status = 'active';

-- ==========================================
-- Performance Analysis
-- ==========================================
-- Before: Duplicate check is O(n) sequential scan
-- After: Duplicate check is O(log n) with composite index
--
-- Before: Date range query scans all transactions
-- After: Date range query uses indexed seek
--
-- Expected improvement: 100x-1000x faster for large datasets
-- Disk space overhead: ~10-15% increase (acceptable trade-off)

-- ==========================================
-- Verification Queries
-- ==========================================
-- To verify indexes were created, run:
-- SELECT * FROM pg_indexes WHERE tablename IN ('transactions', 'bank_accounts');
