-- =====================================================
-- TABELA DE ASSINATURAS - GURU DO DINDIN
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- para criar a tabela de assinaturas e gerenciamento de planos

-- Criar enum para tipos de plano
CREATE TYPE subscription_plan_type AS ENUM ('manual', 'conectado', 'conectado_plus');

-- Criar enum para status de assinatura
CREATE TYPE subscription_status_type AS ENUM ('active', 'pending', 'canceled', 'expired', 'trial');

-- Criar enum para tipos de pagamento
CREATE TYPE payment_type AS ENUM ('credit_card', 'boleto', 'pix');

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Informações do plano
    plan_type subscription_plan_type NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    plan_price DECIMAL(10, 2) NOT NULL,

    -- Status e datas
    status subscription_status_type DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,

    -- Informações de pagamento
    payment_method payment_type,
    payment_processor VARCHAR(50), -- 'asaas', 'mercadopago', 'pagarme', etc
    payment_processor_subscription_id VARCHAR(255), -- ID da assinatura no gateway
    payment_processor_customer_id VARCHAR(255), -- ID do cliente no gateway

    -- Limites do plano
    max_connected_accounts INTEGER DEFAULT 0, -- 0 para manual, 3 para conectado, 10 para plus

    -- Renovação automática
    auto_renew BOOLEAN DEFAULT TRUE,
    next_billing_date TIMESTAMP WITH TIME ZONE,

    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    canceled_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Informações do pagamento
    amount DECIMAL(10, 2) NOT NULL,
    payment_method payment_type NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded

    -- Gateway de pagamento
    payment_processor VARCHAR(50) NOT NULL,
    payment_processor_payment_id VARCHAR(255), -- ID da transação no gateway
    payment_processor_invoice_url VARCHAR(500), -- URL da fatura/boleto

    -- Datas
    payment_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,

    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(payment_status);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at
    BEFORE UPDATE ON subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscriptions
CREATE POLICY "Usuários podem ver suas próprias assinaturas"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias assinaturas"
    ON subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias assinaturas"
    ON subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Políticas RLS para subscription_payments
CREATE POLICY "Usuários podem ver seus próprios pagamentos"
    ON subscription_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios pagamentos"
    ON subscription_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- View para assinatura ativa do usuário
CREATE OR REPLACE VIEW user_active_subscription AS
SELECT
    s.*,
    CASE
        WHEN s.status = 'active' AND (s.end_date IS NULL OR s.end_date > NOW()) THEN true
        ELSE false
    END as is_active
FROM subscriptions s
WHERE s.status IN ('active', 'trial')
    AND (s.end_date IS NULL OR s.end_date > NOW());

-- Comentários para documentação
COMMENT ON TABLE subscriptions IS 'Tabela de assinaturas dos usuários do Guru do Dindin';
COMMENT ON TABLE subscription_payments IS 'Histórico de pagamentos das assinaturas';
COMMENT ON COLUMN subscriptions.max_connected_accounts IS 'Número máximo de contas bancárias que podem ser conectadas: 0 (manual), 3 (conectado), 10 (conectado_plus)';
COMMENT ON COLUMN subscriptions.auto_renew IS 'Se true, a assinatura será renovada automaticamente no final do período';
