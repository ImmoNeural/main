-- Migration: Create custom_budgets table
-- Purpose: Store user-specific budget values for each category
-- Date: 2025-11-14

-- ==========================================
-- 1. Create custom_budgets table
-- ==========================================
CREATE TABLE IF NOT EXISTS custom_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  budget_value DECIMAL(10, 2) NOT NULL CHECK (budget_value >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_category UNIQUE(user_id, category_name)
);

-- ==========================================
-- 2. Create updated_at trigger
-- ==========================================
CREATE OR REPLACE FUNCTION update_custom_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_budgets_updated_at
  BEFORE UPDATE ON custom_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_budgets_updated_at();

-- ==========================================
-- 3. Enable Row Level Security
-- ==========================================
ALTER TABLE custom_budgets ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. Create RLS policies
-- ==========================================

-- Policy: Enable all operations for service role (backend)
CREATE POLICY "Enable all for service role on custom_budgets"
  ON custom_budgets
  USING (true)
  WITH CHECK (true);

-- Policy: Users can view their own budgets
CREATE POLICY "Users can view their own budgets"
  ON custom_budgets FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own budgets
CREATE POLICY "Users can insert their own budgets"
  ON custom_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own budgets
CREATE POLICY "Users can update their own budgets"
  ON custom_budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own budgets
CREATE POLICY "Users can delete their own budgets"
  ON custom_budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. Create indexes for performance
-- ==========================================

-- Index: Fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_custom_budgets_user_id
  ON custom_budgets(user_id);

-- Index: Fast lookup by user_id and category_name (composite)
CREATE INDEX IF NOT EXISTS idx_custom_budgets_user_category
  ON custom_budgets(user_id, category_name);

-- Index: Fast lookup by updated_at (for sync purposes)
CREATE INDEX IF NOT EXISTS idx_custom_budgets_updated_at
  ON custom_budgets(user_id, updated_at DESC);

-- ==========================================
-- 6. Add helpful comments
-- ==========================================
COMMENT ON TABLE custom_budgets IS 'Stores user-specific budget values for expense categories';
COMMENT ON COLUMN custom_budgets.category_name IS 'Name of the category (e.g., Alimentação, Transporte, etc.)';
COMMENT ON COLUMN custom_budgets.budget_value IS 'Monthly budget amount in BRL';

-- ==========================================
-- Verification Queries
-- ==========================================
-- To verify table was created:
-- SELECT * FROM custom_budgets LIMIT 10;
--
-- To verify indexes were created:
-- SELECT * FROM pg_indexes WHERE tablename = 'custom_budgets';
--
-- To verify RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'custom_budgets';
