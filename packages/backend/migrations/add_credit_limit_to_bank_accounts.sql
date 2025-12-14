-- =====================================================
-- MIGRAÇÃO: Adicionar coluna credit_limit em bank_accounts
-- Executar no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Adicionar coluna credit_limit na tabela bank_accounts
-- Armazena o limite de crédito (cartão) ou cheque especial (conta corrente)
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2) DEFAULT NULL;

-- 2. Criar índice para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_bank_accounts_credit_limit ON bank_accounts(credit_limit);

-- 3. Comentário na coluna para documentação
COMMENT ON COLUMN bank_accounts.credit_limit IS 'Limite de crédito (cartão) ou cheque especial (conta corrente) - valor em BRL';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Query para verificar se a coluna foi criada
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
  AND column_name = 'credit_limit';

-- =====================================================
-- COMO FUNCIONA
-- =====================================================
--
-- Para CARTÕES DE CRÉDITO:
--   credit_limit vem de creditData.creditLimit do Pluggy
--   Ex: Limite do cartão = R$ 10.000,00
--
-- Para CONTAS CORRENTES:
--   credit_limit vem de bankData.overdraftContractedLimit do Pluggy
--   Ex: Limite do cheque especial = R$ 2.000,00
--
-- O valor é atualizado automaticamente durante a sincronização
-- da conta via Open Finance (Pluggy)
--
-- =====================================================
