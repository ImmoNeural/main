-- ===============================================
-- Adiciona user_id à tabela transactions
-- ===============================================
--
-- PROBLEMA:
-- A tabela transactions não tem user_id diretamente,
-- forçando JOINs em toda query para filtrar por usuário.
--
-- SOLUÇÃO:
-- Adicionar coluna user_id com valores populados automaticamente
-- via trigger ou através do account_id existente.
--
-- ===============================================

-- 1. Adicionar coluna user_id à tabela transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
ON transactions(user_id);

-- 3. Adicionar índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
ON transactions(user_id, date DESC);

-- 4. Popular user_id para transações existentes
-- (JOIN com bank_accounts para pegar o user_id)
UPDATE transactions t
SET user_id = ba.user_id
FROM bank_accounts ba
WHERE t.account_id = ba.id
AND t.user_id IS NULL;

-- 5. Adicionar constraint de foreign key (opcional, mas recomendado)
-- Descomente se você tiver a tabela de usuários no Supabase
-- ALTER TABLE transactions
-- ADD CONSTRAINT fk_transactions_user_id
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Criar função trigger para auto-popular user_id em novos inserts
CREATE OR REPLACE FUNCTION set_transaction_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se user_id não foi fornecido, buscar da conta bancária
  IF NEW.user_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT user_id INTO NEW.user_id
    FROM bank_accounts
    WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para executar antes do INSERT
DROP TRIGGER IF EXISTS trigger_set_transaction_user_id ON transactions;
CREATE TRIGGER trigger_set_transaction_user_id
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_transaction_user_id();

-- 8. Atualizar RLS (Row Level Security) policies para usar user_id
-- Isso torna as queries MUITO mais rápidas (não precisa JOIN)

-- Remover policy antiga que usa JOIN
DROP POLICY IF EXISTS "Users can only see their own transactions" ON transactions;

-- Criar nova policy usando user_id diretamente
CREATE POLICY "Users can only see their own transactions"
  ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy para INSERT
CREATE POLICY "Users can only insert their own transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy para UPDATE
CREATE POLICY "Users can only update their own transactions"
  ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy para DELETE
CREATE POLICY "Users can only delete their own transactions"
  ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ===============================================
-- VERIFICAÇÃO
-- ===============================================

-- Verificar se todas as transações têm user_id
SELECT
  COUNT(*) as total_transactions,
  COUNT(user_id) as with_user_id,
  COUNT(*) - COUNT(user_id) as missing_user_id
FROM transactions;

-- Mostrar exemplo de dados
SELECT
  id,
  account_id,
  user_id,
  description,
  amount
FROM transactions
LIMIT 5;
