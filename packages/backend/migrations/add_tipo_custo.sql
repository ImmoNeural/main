-- =====================================================
-- MIGRAÇÃO: Adicionar coluna tipo_custo e subcategoria
-- Executar no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Adicionar coluna tipo_custo na tabela custom_budgets
-- Valores: 'fixo' ou 'variavel'
ALTER TABLE custom_budgets
ADD COLUMN IF NOT EXISTS tipo_custo TEXT DEFAULT 'variavel' CHECK (tipo_custo IN ('fixo', 'variavel'));

-- 2. Adicionar coluna subcategoria na tabela custom_budgets
ALTER TABLE custom_budgets
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 3. Adicionar coluna tipo_custo na tabela transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS tipo_custo TEXT CHECK (tipo_custo IN ('fixo', 'variavel'));

-- 4. Adicionar coluna subcategoria na tabela transactions (se não existir)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 5. Criar índice para performance nas queries por tipo_custo
CREATE INDEX IF NOT EXISTS idx_custom_budgets_tipo_custo ON custom_budgets(tipo_custo);
CREATE INDEX IF NOT EXISTS idx_transactions_tipo_custo ON transactions(tipo_custo);
CREATE INDEX IF NOT EXISTS idx_transactions_subcategory ON transactions(subcategory);

-- 6. Atualizar a constraint de unicidade para incluir tipo_custo
-- Primeiro remover a constraint antiga
ALTER TABLE custom_budgets DROP CONSTRAINT IF EXISTS custom_budgets_user_id_category_name_key;

-- Criar nova constraint que inclui tipo_custo
-- Agora podemos ter: Saúde_fixo e Saúde_variavel como registros separados
ALTER TABLE custom_budgets
ADD CONSTRAINT custom_budgets_user_category_tipo_key
UNIQUE (user_id, category_name, tipo_custo);

-- 7. Renomear categoria "Serviços Financeiros" para "Banco e Seguradoras"
UPDATE custom_budgets
SET category_name = 'Banco e Seguradoras'
WHERE category_name = 'Serviços Financeiros';

UPDATE transactions
SET category = 'Banco e Seguradoras'
WHERE category = 'Serviços Financeiros';

-- =====================================================
-- COMENTÁRIOS EXPLICATIVOS
-- =====================================================
--
-- tipo_custo pode ser:
--   'fixo' - despesas recorrentes (assinaturas, mensalidades, etc)
--   'variavel' - despesas que variam (compras, alimentação, etc)
--
-- Na tabela custom_budgets:
--   Saúde com tipo_custo='fixo' -> convênio médico
--   Saúde com tipo_custo='variavel' -> remédios esporádicos
--
-- Na tabela transactions:
--   Cada transação terá seu tipo_custo definido
--   baseado na subcategoria escolhida pelo usuário
--
-- =====================================================

-- 8. Query para verificar as migrações
SELECT
  'custom_budgets' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'custom_budgets'
  AND column_name IN ('tipo_custo', 'subcategory')
UNION ALL
SELECT
  'transactions' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('tipo_custo', 'subcategory');
