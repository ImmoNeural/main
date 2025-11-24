-- Script para estender trials de 7 para 62 dias
-- Execute este script no Supabase SQL Editor (https://supabase.com/dashboard)

-- Atualizar todas as assinaturas com trial ativo de 7 dias
UPDATE subscriptions
SET
  trial_end_date = trial_end_date + INTERVAL '55 days',
  end_date = end_date + INTERVAL '55 days',
  metadata = jsonb_set(
    jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{trial_days}',
      '62'::jsonb
    ),
    '{extended_from}',
    '7'::jsonb
  )
WHERE
  status IN ('trial', 'pending')
  AND (metadata->>'trial_days')::int = 7;

-- Ver resultados após execução
SELECT
  id,
  user_id,
  status,
  trial_end_date,
  end_date,
  metadata->>'trial_days' as trial_days,
  metadata->>'extended_from' as extended_from
FROM subscriptions
WHERE status IN ('trial', 'pending')
ORDER BY created_at DESC;
