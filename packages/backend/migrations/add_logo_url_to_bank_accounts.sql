-- =====================================================
-- MIGRAÇÃO: Adicionar coluna logo_url em bank_accounts
-- Executar no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Adicionar coluna logo_url na tabela bank_accounts
-- Armazena a URL do logo/ícone do banco (vindo do Pluggy)
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- 2. Comentário na coluna para documentação
COMMENT ON COLUMN bank_accounts.logo_url IS 'URL do logo/ícone do banco - obtido do Pluggy connector.imageUrl';

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
  AND column_name = 'logo_url';

-- =====================================================
-- COMO FUNCIONA
-- =====================================================
--
-- O logo vem do campo connector.imageUrl do Pluggy
-- Padrão: https://cdn.pluggy.ai/assets/connector-icons/{connector-id}.svg
--
-- Exemplo para Itaú (connector 201):
--   https://cdn.pluggy.ai/assets/connector-icons/201.svg
--
-- O valor é salvo automaticamente quando a conta é conectada
-- via Open Finance (Pluggy)
--
-- =====================================================
