-- Verificar tipo da coluna 'date' em transactions
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'date';

-- Se o resultado mostrar 'timestamptz' ou 'timestamp', execute os comandos abaixo:

-- 1. Primeiro, vamos criar uma nova coluna temporária com o tipo correto
ALTER TABLE transactions ADD COLUMN date_bigint BIGINT;

-- 2. Se a coluna atual é TIMESTAMPTZ, converter para milissegundos
-- (extrair epoch em segundos e multiplicar por 1000)
UPDATE transactions
SET date_bigint = EXTRACT(EPOCH FROM date::timestamptz) * 1000
WHERE date_bigint IS NULL AND date IS NOT NULL;

-- 3. Se a coluna atual já tem números mas como NUMERIC/INT, copiar direto
-- UPDATE transactions SET date_bigint = date::BIGINT WHERE date_bigint IS NULL AND date IS NOT NULL;

-- 4. Remover a coluna antiga
ALTER TABLE transactions DROP COLUMN date;

-- 5. Renomear a nova coluna
ALTER TABLE transactions RENAME COLUMN date_bigint TO date;

-- 6. Adicionar constraint NOT NULL
ALTER TABLE transactions ALTER COLUMN date SET NOT NULL;

-- 7. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Verificar se funcionou
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'date';

-- Testar uma query
SELECT id, date, description, amount
FROM transactions
ORDER BY date DESC
LIMIT 5;
