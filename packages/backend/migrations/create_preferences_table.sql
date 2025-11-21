-- =================================================================
-- MIGRAÇÃO: Criar tabela preferences e atualizar custom_budgets
-- =================================================================

-- 1. Criar tabela preferences
CREATE TABLE IF NOT EXISTS preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    tipo_custo TEXT NOT NULL CHECK (tipo_custo IN ('fixo', 'variavel')),
    tipo_categoria TEXT NOT NULL DEFAULT 'normal' CHECK (tipo_categoria IN ('hibrido', 'normal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category, subcategory)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_category ON preferences(category);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- 4. Criar política RLS para preferences
CREATE POLICY "Users can only access their own preferences"
ON preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Atualizar custom_budgets: remover subcategory e garantir estrutura correta
-- Primeiro, remover a coluna subcategory se existir
ALTER TABLE custom_budgets DROP COLUMN IF EXISTS subcategory;

-- 6. Garantir que tipo_custo existe em custom_budgets
ALTER TABLE custom_budgets
ADD COLUMN IF NOT EXISTS tipo_custo TEXT DEFAULT 'variavel' CHECK (tipo_custo IN ('fixo', 'variavel'));

-- 7. Criar constraint única para user_id + category_name + tipo_custo
-- Isso permite ter duas linhas para mesma categoria (uma fixo, uma variavel)
ALTER TABLE custom_budgets
DROP CONSTRAINT IF EXISTS custom_budgets_user_id_category_name_key;

ALTER TABLE custom_budgets
DROP CONSTRAINT IF EXISTS custom_budgets_user_category_tipo_unique;

ALTER TABLE custom_budgets
ADD CONSTRAINT custom_budgets_user_category_tipo_unique
UNIQUE (user_id, category_name, tipo_custo);

-- 8. Renomear categoria antiga se existir
UPDATE custom_budgets
SET category_name = 'Banco e Seguradoras'
WHERE category_name = 'Serviços Financeiros';
