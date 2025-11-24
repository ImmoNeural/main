-- Script para estender trials de 7 para 62 dias
-- Execute este script no Supabase SQL Editor

-- PASSO 1: Ver os dados ANTES da atualização
SELECT
  id,
  user_id,
  status,
  plan_type,
  trial_end_date,
  end_date,
  created_at,
  EXTRACT(DAY FROM (trial_end_date - created_at)) as dias_totais,
  metadata
FROM subscriptions
WHERE status IN ('trial', 'pending')
ORDER BY created_at DESC;

-- PASSO 2: Atualizar TODOS os trials ativos para 62 dias a partir da criação
UPDATE subscriptions
SET
  trial_end_date = created_at + INTERVAL '62 days',
  end_date = created_at + INTERVAL '62 days',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{trial_days}',
    '62'::jsonb
  )
WHERE
  status IN ('trial', 'pending');

-- PASSO 3: Ver os dados DEPOIS da atualização
SELECT
  id,
  user_id,
  status,
  plan_type,
  trial_end_date,
  end_date,
  created_at,
  EXTRACT(DAY FROM (trial_end_date - created_at)) as dias_totais,
  metadata->>'trial_days' as trial_days_metadata
FROM subscriptions
WHERE status IN ('trial', 'pending')
ORDER BY created_at DESC;
