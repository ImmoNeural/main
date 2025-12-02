-- ============================================================================
-- MIGRAÇÃO: Sistema de Aprendizado de Categorização
-- ============================================================================
-- Este script adiciona suporte para:
-- 1. Rastreamento de categorizações manuais (transactions.manually_categorized)
-- 2. Padrões globais de categorização (global_category_patterns)
-- ============================================================================

-- 1. Adicionar coluna manually_categorized na tabela transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS manually_categorized BOOLEAN DEFAULT FALSE;

-- Criar índice para buscas rápidas de transações categorizadas manualmente
CREATE INDEX IF NOT EXISTS idx_transactions_manually_categorized
ON transactions(manually_categorized)
WHERE manually_categorized = TRUE;

-- 2. Criar tabela de padrões globais de categorização
CREATE TABLE IF NOT EXISTS global_category_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Padrão de descrição (normalizado, sem números/datas)
  description_pattern TEXT NOT NULL,

  -- Categoria e subcategoria
  category TEXT NOT NULL,
  subcategory TEXT,

  -- Estatísticas de uso
  user_count INTEGER DEFAULT 1,           -- Quantos usuários diferentes usaram este padrão
  usage_count INTEGER DEFAULT 1,          -- Total de vezes que foi usado

  -- Confiança do padrão (0.0 a 1.0)
  -- Calculado como: usuários_concordam / total_usuários
  confidence DECIMAL(3,2) DEFAULT 1.00,

  -- Controle de conflitos
  -- Se diferentes usuários categorizaram de forma diferente
  has_conflict BOOLEAN DEFAULT FALSE,
  conflict_categories JSONB DEFAULT '[]'::jsonb,  -- [{category, count}, ...]

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garantir que cada padrão é único
  UNIQUE(description_pattern)
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_global_patterns_pattern
ON global_category_patterns(description_pattern);

CREATE INDEX IF NOT EXISTS idx_global_patterns_confidence
ON global_category_patterns(confidence DESC)
WHERE has_conflict = FALSE;

CREATE INDEX IF NOT EXISTS idx_global_patterns_category
ON global_category_patterns(category);

-- 3. Criar tabela de histórico individual do usuário (opcional, para Camada 2A)
CREATE TABLE IF NOT EXISTS user_category_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Usuário dono da preferência
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Padrão de descrição
  description_pattern TEXT NOT NULL,

  -- Categoria preferida pelo usuário
  category TEXT NOT NULL,
  subcategory TEXT,

  -- Estatísticas
  usage_count INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Cada usuário tem apenas uma preferência por padrão
  UNIQUE(user_id, description_pattern)
);

-- Índice para busca rápida por usuário
CREATE INDEX IF NOT EXISTS idx_user_preferences_user
ON user_category_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_pattern
ON user_category_preferences(description_pattern);

-- 4. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_global_patterns_updated_at ON global_category_patterns;
CREATE TRIGGER update_global_patterns_updated_at
  BEFORE UPDATE ON global_category_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_category_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_category_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Função para atualizar padrão global quando usuário categoriza
-- Esta função será chamada pelo backend, mas pode ser usada como trigger também
CREATE OR REPLACE FUNCTION upsert_global_pattern(
  p_pattern TEXT,
  p_category TEXT,
  p_subcategory TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  existing_record RECORD;
BEGIN
  -- Verificar se já existe
  SELECT * INTO existing_record
  FROM global_category_patterns
  WHERE description_pattern = p_pattern;

  IF existing_record IS NULL THEN
    -- Não existe: criar novo
    INSERT INTO global_category_patterns (description_pattern, category, subcategory)
    VALUES (p_pattern, p_category, p_subcategory);
  ELSIF existing_record.category = p_category THEN
    -- Existe com mesma categoria: incrementar contadores
    UPDATE global_category_patterns
    SET
      user_count = user_count + 1,
      usage_count = usage_count + 1,
      confidence = LEAST(1.0, confidence + 0.05),
      updated_at = NOW()
    WHERE description_pattern = p_pattern;
  ELSE
    -- Existe com categoria diferente: marcar conflito
    UPDATE global_category_patterns
    SET
      has_conflict = TRUE,
      conflict_categories = conflict_categories || jsonb_build_array(jsonb_build_object('category', p_category, 'count', 1)),
      updated_at = NOW()
    WHERE description_pattern = p_pattern;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMO USAR:
-- ============================================================================
--
-- 1. Execute este script no Supabase SQL Editor
--
-- 2. No backend, quando usuário categorizar manualmente:
--    - UPDATE transactions SET manually_categorized = TRUE WHERE id = ?
--    - SELECT upsert_global_pattern('padrão', 'categoria', 'subcategoria')
--    - INSERT/UPDATE em user_category_preferences
--
-- 3. Para buscar padrões globais confiáveis:
--    SELECT * FROM global_category_patterns
--    WHERE has_conflict = FALSE AND confidence >= 0.7
--    ORDER BY confidence DESC
--
-- ============================================================================
