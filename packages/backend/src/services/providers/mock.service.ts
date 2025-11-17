import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../config/supabase';
import categorizationService from '../categorization.service';
import { BankAccount, Transaction } from '../../types';

/**
 * Serviço Mock para demonstração sem credenciais reais do Pluggy
 * Simula conexão bancária e gera dados fictícios realistas
 */

/**
 * Converte timestamp em milissegundos para formato ISO string (para TIMESTAMPTZ do PostgreSQL)
 */
function toISOString(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString();
}

interface MockBankData {
  name: string;
  accountNumber: string;
  balance: number;
  currency: string;
}

// Dados fictícios de bancos brasileiros
const MOCK_BANKS: Record<string, MockBankData> = {
  '341': { name: 'Itaú', accountNumber: '1234-5', balance: 15432.50, currency: 'BRL' },
  '237': { name: 'Bradesco', accountNumber: '6789-0', balance: 8920.30, currency: 'BRL' },
  '1': { name: 'Banco do Brasil', accountNumber: '2345-1', balance: 25100.00, currency: 'BRL' },
  '104': { name: 'Caixa Econômica', accountNumber: '8901-2', balance: 12500.75, currency: 'BRL' },
  '33': { name: 'Santander', accountNumber: '4567-8', balance: 18750.40, currency: 'BRL' },
  '212': { name: 'Banco Original', accountNumber: '3456-9', balance: 9234.60, currency: 'BRL' },
  '260': { name: 'Nubank', accountNumber: '7890-3', balance: 22100.80, currency: 'BRL' },
  '077': { name: 'Inter', accountNumber: '5678-4', balance: 6543.20, currency: 'BRL' },
};

// Transações fictícias brasileiras realistas
const MOCK_TRANSACTIONS = [
  // Supermercados
  { description: 'COOP COOPERATIVA', merchant: 'Coop', amount: -235.80, days: 2, category: 'Supermercado' },
  { description: 'CARREFOUR HIPER', merchant: 'Carrefour', amount: -412.50, days: 5, category: 'Supermercado' },
  { description: 'EXTRA SUPERMERCADO', merchant: 'Extra', amount: -189.30, days: 8, category: 'Supermercado' },
  { description: 'ASSAI ATACADISTA', merchant: 'Assaí', amount: -523.70, days: 12, category: 'Supermercado' },

  // Restaurantes
  { description: 'IFOOD *RESTAURANTE', merchant: 'iFood', amount: -65.90, days: 1, category: 'Alimentação' },
  { description: 'RAPPI *MCDONALD S', merchant: 'Rappi', amount: -42.30, days: 3, category: 'Alimentação' },
  { description: 'OUTBACK STEAKHOUSE', merchant: 'Outback', amount: -189.00, days: 7, category: 'Restaurante' },
  { description: 'SPOLETO SHOPPING', merchant: 'Spoleto', amount: -38.90, days: 10, category: 'Alimentação' },

  // Saúde
  { description: 'DENTALPLUS ODONTO', merchant: 'DentalPlus', amount: -450.00, days: 15, category: 'Saúde' },
  { description: 'DROGASIL FARMACIA', merchant: 'Drogasil', amount: -87.50, days: 4, category: 'Farmácia' },
  { description: 'ODONTOCOMPANY', merchant: 'OdontoCompany', amount: -320.00, days: 20, category: 'Saúde' },

  // Transporte
  { description: 'UBER *TRIP', merchant: 'Uber', amount: -24.50, days: 1, category: 'Transporte' },
  { description: '99TAXIS *CORRIDA', merchant: '99', amount: -18.70, days: 3, category: 'Transporte' },
  { description: 'POSTO SHELL BR', merchant: 'Shell', amount: -280.00, days: 6, category: 'Combustível' },
  { description: 'IPIRANGA POSTOS', merchant: 'Ipiranga', amount: -315.50, days: 14, category: 'Combustível' },

  // Entretenimento
  { description: 'CINEMARK SHOPPING', merchant: 'Cinemark', amount: -92.00, days: 9, category: 'Entretenimento' },
  { description: 'PLAYCENTER PARK', merchant: 'PlayCenter', amount: -150.00, days: 18, category: 'Entretenimento' },
  { description: 'NETFLIX.COM', merchant: 'Netflix', amount: -39.90, days: 1, category: 'Streaming' },
  { description: 'SPOTIFY BRASIL', merchant: 'Spotify', amount: -21.90, days: 1, category: 'Streaming' },

  // Serviços
  { description: 'ENEL ENERGIA SP', merchant: 'Enel', amount: -245.80, days: 25, category: 'Utilidades' },
  { description: 'SABESP AGUA', merchant: 'Sabesp', amount: -128.40, days: 22, category: 'Utilidades' },
  { description: 'VIVO CELULAR', merchant: 'Vivo', amount: -89.90, days: 15, category: 'Telefone' },
  { description: 'AMAZON PRIME BR', merchant: 'Amazon', amount: -14.90, days: 12, category: 'Assinatura' },

  // Compras
  { description: 'MERCADO LIVRE', merchant: 'Mercado Livre', amount: -345.00, days: 11, category: 'Compras Online' },
  { description: 'MAGAZINE LUIZA', merchant: 'Magalu', amount: -567.90, days: 16, category: 'Eletrônicos' },
  { description: 'RENNER LOJAS', merchant: 'Renner', amount: -234.50, days: 19, category: 'Vestuário' },
  { description: 'AMERICANAS COM', merchant: 'Americanas', amount: -123.40, days: 21, category: 'Compras Online' },

  // Receitas
  { description: 'PIX RECEBIDO', merchant: 'PIX', amount: 500.00, days: 5, category: 'Transferência' },
  { description: 'SALARIO EMPRESA XYZ', merchant: 'Empresa', amount: 5500.00, days: 30, category: 'Salário' },
  { description: 'TED RECEBIDO', merchant: 'TED', amount: 1200.00, days: 15, category: 'Transferência' },

  // PIX diversos
  { description: 'PIX ENVIADO - JOAO S', merchant: 'PIX', amount: -150.00, days: 3, category: 'Transferência' },
  { description: 'PIX ENVIADO - MARIA O', merchant: 'PIX', amount: -80.00, days: 7, category: 'Transferência' },
];

/**
 * Gera transações fictícias para um banco
 */
export function generateMockTransactions(userId: string, accountId: string, bankName: string): Transaction[] {
  const transactions: Transaction[] = [];
  const now = Date.now();

  // Pegar 20-25 transações aleatórias
  const numTransactions = 20 + Math.floor(Math.random() * 6);
  const selectedTransactions = [...MOCK_TRANSACTIONS]
    .sort(() => Math.random() - 0.5)
    .slice(0, numTransactions);

  selectedTransactions.forEach((mockTx, index) => {
    const transDate = now - mockTx.days * 24 * 60 * 60 * 1000;
    const categorization = categorizationService.categorizeTransaction(
      mockTx.description,
      mockTx.merchant
    );

    const transaction: Transaction = {
      id: uuidv4(),
      user_id: userId, // Adicionar user_id para queries mais eficientes
      account_id: accountId,
      transaction_id: `MOCK_${Date.now()}_${index}`,
      date: transDate,
      amount: mockTx.amount,
      currency: 'BRL',
      description: mockTx.description,
      merchant: mockTx.merchant,
      category: categorization.category,
      type: mockTx.amount < 0 ? 'debit' : 'credit',
      balance_after: undefined,
      reference: mockTx.description,
      status: 'completed',
      created_at: now,
      updated_at: now,
    };

    transactions.push(transaction);
  });

  return transactions.sort((a, b) => b.date - a.date);
}

/**
 * Cria uma conta bancária fictícia e transações
 */
export async function createMockBankAccount(
  userId: string,
  bankId: string,
  bankName: string
): Promise<{ account: BankAccount; transactions: Transaction[] }> {
  const mockData = MOCK_BANKS[bankId] || {
    name: bankName,
    accountNumber: '0000-0',
    balance: 10000.00,
    currency: 'BRL',
  };

  const accountId = uuidv4();
  const now = Date.now();

  // Criar conta bancária
  const bankAccount: BankAccount = {
    id: accountId,
    user_id: userId,
    bank_name: mockData.name,
    account_number: mockData.accountNumber,
    iban: undefined,
    account_type: 'CHECKING',
    balance: mockData.balance,
    currency: mockData.currency,
    access_token: `mock_token_${accountId}`,
    refresh_token: undefined,
    token_expires_at: now + 90 * 24 * 60 * 60 * 1000, // 90 dias
    consent_id: `mock_consent_${accountId}`,
    consent_expires_at: now + 90 * 24 * 60 * 60 * 1000,
    connected_at: now,
    status: 'active',
    provider_account_id: `mock_provider_${accountId}`,
    created_at: now,
    updated_at: now,
  };

  // Salvar conta no banco de dados
  console.log('[Mock] 📝 Attempting to insert bank account...');
  console.log('[Mock] Account data:', {
    id: bankAccount.id,
    user_id: bankAccount.user_id,
    bank_name: bankAccount.bank_name,
  });

  const { error: accountError } = await supabase
    .from('bank_accounts')
    .insert({
      id: bankAccount.id,
      user_id: bankAccount.user_id,
      bank_name: bankAccount.bank_name,
      account_number: bankAccount.account_number,
      iban: bankAccount.iban,
      account_type: bankAccount.account_type,
      balance: bankAccount.balance,
      currency: bankAccount.currency,
      access_token: bankAccount.access_token,
      refresh_token: bankAccount.refresh_token,
      token_expires_at: toISOString(bankAccount.token_expires_at),
      consent_id: bankAccount.consent_id,
      consent_expires_at: toISOString(bankAccount.consent_expires_at),
      connected_at: toISOString(bankAccount.connected_at),
      status: bankAccount.status,
      provider_account_id: bankAccount.provider_account_id,
      created_at: toISOString(bankAccount.created_at),
      updated_at: toISOString(bankAccount.updated_at),
    });

  if (accountError) {
    console.error('[Mock] ❌ Error inserting account:', accountError);
    console.error('[Mock] Error details:', JSON.stringify(accountError, null, 2));
    throw new Error(`Failed to insert bank account: ${accountError.message}`);
  }

  console.log('[Mock] ✅ Bank account inserted successfully');

  // Gerar e salvar transações
  const transactions = generateMockTransactions(userId, accountId, bankName);
  console.log(`[Mock] 📝 Generated ${transactions.length} mock transactions`);

  // Inserir todas as transações de uma vez
  const transactionsData = transactions.map((tx) => ({
    id: tx.id,
    user_id: tx.user_id, // Adicionar user_id para queries mais eficientes
    account_id: tx.account_id,
    transaction_id: tx.transaction_id,
    date: tx.date, // BIGINT - manter em ms
    amount: tx.amount,
    currency: tx.currency,
    description: tx.description,
    merchant: tx.merchant,
    category: tx.category,
    type: tx.type,
    balance_after: tx.balance_after,
    reference: tx.reference,
    status: tx.status,
    created_at: toISOString(tx.created_at), // TIMESTAMPTZ - converter para ISO
    updated_at: toISOString(tx.updated_at), // TIMESTAMPTZ - converter para ISO
  }));

  console.log('[Mock] 📝 Attempting to insert transactions...');

  const { error: transactionsError } = await supabase
    .from('transactions')
    .insert(transactionsData);

  if (transactionsError) {
    console.error('[Mock] ❌ Error inserting transactions:', transactionsError);
    console.error('[Mock] Error details:', JSON.stringify(transactionsError, null, 2));
    throw new Error(`Failed to insert transactions: ${transactionsError.message}`);
  }

  console.log(`[Mock] ✅ Created mock account for ${mockData.name} with ${transactions.length} transactions`);

  return { account: bankAccount, transactions };
}
