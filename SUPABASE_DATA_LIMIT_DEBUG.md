# 🔍 Debug: Limitação de 20 Dados no Supabase

## Problema
A aplicação está retornando apenas ~20 semanas de dados, independentemente do período selecionado (180 dias, 365 dias, etc).

## Logs Adicionados

### Backend (Render)
Após o deploy, verifique os logs do Render. Você verá informações detalhadas:

```
📊 Weekly stats request: user=abc12345..., weeks=26, date range=2024-05-01 to 2024-11-10
🔍 Start timestamp: 1714521600000, End timestamp: 1731225600000
📈 Total transactions in database for user: XXX
📊 Query returned YYY transactions (count: YYY)
📅 First transaction date: 2024-XX-XX
📅 Last transaction date: 2024-XX-XX
✅ Returning ZZZ weeks (found YYY transactions in period)
📊 Weeks: 2024-W19, 2024-W20, ..., 2024-W45
```

### Interpretação dos Logs

**Se ver:**
- `Total transactions in database for user: 500` mas `Query returned 20 transactions`
  - ✅ **Problema identificado:** Query está sendo limitada por algum motivo
  - 🔧 **Solução:** Verificar RLS policies no Supabase (veja abaixo)

- `Total transactions in database for user: 200` e `Query returned 200 transactions`
  - ✅ **Problema identificado:** Todas as transações estão sendo retornadas
  - ⚠️ **Mas:** Só há transações para 20 semanas no banco (falta de dados)
  - 🔧 **Solução:** Fazer sync das contas bancárias para puxar mais dados históricos

- `WARNING: Expected 26 weeks but only got 20 weeks!`
  - ⚠️ **Significa:** Não há transações para 6 semanas no período solicitado
  - 🔧 **Possível solução:** Dados históricos não existem no banco

## Verificações no Supabase Dashboard

### 1. Verificar RLS Policies na tabela `transactions`

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Database** → **Tables** → `transactions`
4. Clique na aba **RLS Policies**

**O que procurar:**
- ✅ **CORRETO:** Policies com SELECT que usam `auth.uid()` e não limitam por data ou quantidade
- ❌ **INCORRETO:** Policies com `LIMIT`, `date > now() - interval '3 months'`, etc.

### 2. Verificar quantidade real de dados

Execute no **SQL Editor** do Supabase:

```sql
-- Ver total de transações por usuário
SELECT
  ba.user_id,
  COUNT(*) as total_transactions,
  MIN(t.date) as oldest_transaction,
  MAX(t.date) as newest_transaction
FROM transactions t
JOIN bank_accounts ba ON t.account_id = ba.id
GROUP BY ba.user_id;
```

```sql
-- Ver distribuição de transações por semana
SELECT
  DATE_TRUNC('week', TO_TIMESTAMP(t.date / 1000)) as week,
  COUNT(*) as transaction_count
FROM transactions t
JOIN bank_accounts ba ON t.account_id = ba.id
WHERE ba.user_id = 'SEU_USER_ID_AQUI'
GROUP BY week
ORDER BY week DESC;
```

### 3. Desabilitar RLS temporariamente (TESTE APENAS!)

**⚠️ ATENÇÃO: Isso expõe TODOS os dados! Use apenas para teste local!**

No SQL Editor:
```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```

Teste a aplicação. Se funcionar, o problema é nas RLS policies.

**IMPORTANTE: Reabilite depois:**
```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

## Políticas RLS Corretas

Para referência, as policies devem ser assim:

```sql
-- Policy para SELECT
CREATE POLICY "Users can view their own transactions"
ON transactions
FOR SELECT
USING (
  account_id IN (
    SELECT id FROM bank_accounts
    WHERE user_id = auth.uid()
  )
);
```

**SEM limitações de:**
- LIMIT
- Filtros de data hard-coded
- Quantidade máxima de registros

## Próximos Passos

1. ✅ Faça deploy das alterações (já foram commitadas)
2. 🔍 Verifique os logs do Render após fazer uma requisição
3. 📊 Execute as queries SQL acima no Supabase
4. 📝 Compartilhe os resultados para eu ajudar a diagnosticar

## Possíveis Causas

### Causa 1: RLS Policy Limitada
- **Sintoma:** `Total transactions: 500`, `Query returned: 20`
- **Solução:** Corrigir policies RLS

### Causa 2: Dados Insuficientes no Banco
- **Sintoma:** `Total transactions: 200`, `Query returned: 200`, mas só 20 semanas
- **Solução:** Fazer sync das contas bancárias

### Causa 3: Configuração do Supabase Client
- **Sintoma:** Todos os endpoints retornam exatamente 20 registros
- **Solução:** Já corrigido no commit anterior (adicionei config no client)

### Causa 4: Configuração do Projeto Supabase
- **Sintoma:** Limite hard-coded no projeto
- **Solução:** Verificar em Settings → API → API Settings → Max Rows

---

**Após verificar, me informe:**
1. O que aparece nos logs do Render
2. Quantas transações há no banco (query SQL)
3. Se há policies RLS na tabela transactions
