-- SQL para corrigir políticas RLS e permitir inserções do backend
-- Execute este SQL no Supabase SQL Editor

-- 1. Desabilitar RLS temporariamente para testar
-- (ATENÇÃO: Isso permite acesso total - apenas para desenvolvimento)
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- 2. OU manter RLS mas adicionar políticas mais permissivas para service_role

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON bank_accounts;

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- Criar políticas que permitem service_role (backend) fazer tudo
-- e usuários apenas suas próprias linhas

-- BANK_ACCOUNTS
CREATE POLICY "Enable all for service role on bank_accounts"
  ON bank_accounts
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
  ON bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "Enable all for service role on transactions"
  ON transactions
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = transactions.account_id
      AND bank_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their transactions"
  ON transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = transactions.account_id
      AND bank_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bank_accounts
      WHERE bank_accounts.id = transactions.account_id
      AND bank_accounts.user_id = auth.uid()
    )
  );

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Enable all for service role on profiles"
  ON profiles
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verificar se as políticas foram criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
