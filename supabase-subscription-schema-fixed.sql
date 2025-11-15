-- =====================================================
-- CORREÇÃO: POLÍTICAS RLS PARA PERMITIR BACKEND INSERIR DADOS
-- =====================================================
-- Execute este script no SQL Editor do Supabase para corrigir as políticas RLS

-- 1. REMOVER políticas antigas que bloqueiam o backend
DROP POLICY IF EXISTS "Usuários podem criar suas próprias assinaturas" ON subscriptions;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias assinaturas" ON subscriptions;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios pagamentos" ON subscription_payments;

-- 2. CRIAR novas políticas que permitem backend (service_role) fazer operações

-- Política de INSERT para subscriptions
-- Permite: usuário criar sua própria assinatura OU backend com service_role
CREATE POLICY "Permitir insert de assinaturas"
    ON subscriptions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id  -- Usuário pode criar sua própria assinatura
        OR auth.jwt() ->> 'role' = 'service_role'  -- OU backend pode criar para qualquer usuário
        OR auth.role() = 'service_role'
    );

-- Política de UPDATE para subscriptions
-- Permite: usuário atualizar sua própria assinatura OU backend com service_role
CREATE POLICY "Permitir update de assinaturas"
    ON subscriptions FOR UPDATE
    USING (
        auth.uid() = user_id  -- Usuário pode atualizar sua própria assinatura
        OR auth.jwt() ->> 'role' = 'service_role'  -- OU backend pode atualizar qualquer assinatura
        OR auth.role() = 'service_role'
    );

-- Política de INSERT para subscription_payments
-- Permite: backend com service_role criar pagamentos
CREATE POLICY "Permitir insert de pagamentos"
    ON subscription_payments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id  -- Usuário pode criar seu próprio pagamento
        OR auth.jwt() ->> 'role' = 'service_role'  -- OU backend pode criar para qualquer usuário
        OR auth.role() = 'service_role'
    );

-- Política de UPDATE para subscription_payments
CREATE POLICY "Permitir update de pagamentos"
    ON subscription_payments FOR UPDATE
    USING (
        auth.uid() = user_id  -- Usuário pode atualizar seu próprio pagamento
        OR auth.jwt() ->> 'role' = 'service_role'  -- OU backend pode atualizar qualquer pagamento
        OR auth.role() = 'service_role'
    );

-- 3. VERIFICAR se as políticas SELECT existem (não mexer nelas)
-- As políticas SELECT já existem e estão corretas:
-- - "Usuários podem ver suas próprias assinaturas"
-- - "Usuários podem ver seus próprios pagamentos"

-- 4. GRANT explícito para authenticated e service_role
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON subscription_payments TO authenticated;
GRANT ALL ON subscription_payments TO service_role;

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('subscriptions', 'subscription_payments')
ORDER BY tablename, policyname;
