import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  OpenBankingAuthRequest,
  OpenBankingAuthResponse,
  OpenBankingTokenResponse,
  OpenBankingAccount,
  OpenBankingTransaction
} from '../types';

/**
 * Serviço de integração com APIs Open Banking (PSD2)
 *
 * Este é um exemplo que funciona com o padrão de APIs Open Banking.
 * Para produção, você deve usar um provedor como:
 * - Tink (https://tink.com)
 * - GoCardless (https://gocardless.com/bank-account-data/)
 * - Plaid (https://plaid.com) - principalmente para US/UK
 * - Salt Edge (https://www.saltedge.com)
 */
class OpenBankingService {
  private client: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.OPEN_BANKING_CLIENT_ID || '';
    this.clientSecret = process.env.OPEN_BANKING_CLIENT_SECRET || '';
    this.redirectUri = process.env.OPEN_BANKING_REDIRECT_URI || '';

    this.client = axios.create({
      baseURL: process.env.OPEN_BANKING_API_URL || 'https://api.openbanking.example.com',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Lista de bancos disponíveis (exemplo)
   * Em produção, isso viria da API do provedor
   */
  async getAvailableBanks() {
    // Mock de bancos disponíveis
    return [
      { id: 'deutsche-bank', name: 'Deutsche Bank', logo: '🏦', country: 'DE' },
      { id: 'commerzbank', name: 'Commerzbank', logo: '🏦', country: 'DE' },
      { id: 'sparkasse', name: 'Sparkasse', logo: '🏦', country: 'DE' },
      { id: 'ing', name: 'ING', logo: '🏦', country: 'DE' },
      { id: 'n26', name: 'N26', logo: '🏦', country: 'DE' },
      { id: 'revolut', name: 'Revolut', logo: '🏦', country: 'GB' },
    ];
  }

  /**
   * Inicia o processo de autenticação com o banco
   */
  async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
    const state = uuidv4();
    const consentId = uuidv4();

    try {
      // Em produção, fazer chamada real à API:
      // const response = await this.client.post('/auth/initiate', {
      //   bank_id: request.bank_id,
      //   redirect_uri: request.redirect_uri,
      //   scope: 'accounts transactions',
      //   state: state,
      //   access_valid_for_days: 90
      // });

      // Mock response
      const authorizationUrl = `${this.client.defaults.baseURL}/auth?` +
        `client_id=${this.clientId}&` +
        `redirect_uri=${encodeURIComponent(request.redirect_uri)}&` +
        `state=${state}&` +
        `consent_id=${consentId}&` +
        `bank_id=${request.bank_id}`;

      return {
        authorization_url: authorizationUrl,
        state,
        consent_id: consentId,
      };
    } catch (error) {
      console.error('Error initiating auth:', error);
      throw new Error('Failed to initiate bank authorization');
    }
  }

  /**
   * Troca o código de autorização por tokens de acesso
   */
  async exchangeCodeForToken(code: string, state: string): Promise<OpenBankingTokenResponse> {
    try {
      // Em produção:
      // const response = await this.client.post('/auth/token', {
      //   grant_type: 'authorization_code',
      //   code,
      //   redirect_uri: this.redirectUri,
      //   client_id: this.clientId,
      //   client_secret: this.clientSecret,
      // });

      // Mock response
      return {
        access_token: `access_token_${uuidv4()}`,
        refresh_token: `refresh_token_${uuidv4()}`,
        expires_in: 7776000, // 90 days
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Renova o token de acesso usando o refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OpenBankingTokenResponse> {
    try {
      // Em produção:
      // const response = await this.client.post('/auth/token', {
      //   grant_type: 'refresh_token',
      //   refresh_token: refreshToken,
      //   client_id: this.clientId,
      //   client_secret: this.clientSecret,
      // });

      // Mock response
      return {
        access_token: `access_token_${uuidv4()}`,
        refresh_token: `refresh_token_${uuidv4()}`,
        expires_in: 7776000,
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Busca as contas bancárias do usuário
   */
  async getAccounts(accessToken: string): Promise<OpenBankingAccount[]> {
    try {
      // Em produção:
      // const response = await this.client.get('/accounts', {
      //   headers: {
      //     Authorization: `Bearer ${accessToken}`,
      //   },
      // });

      // Mock response
      return [
        {
          id: uuidv4(),
          iban: 'DE89370400440532013000',
          currency: 'EUR',
          name: 'Conta Corrente',
          account_type: 'checking',
          balance: {
            amount: 5430.50,
            currency: 'EUR',
          },
        },
      ];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch bank accounts');
    }
  }

  /**
   * Busca as transações de uma conta nos últimos N dias
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    days: number = 90
  ): Promise<OpenBankingTransaction[]> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Em produção:
      // const response = await this.client.get(`/accounts/${accountId}/transactions`, {
      //   headers: {
      //     Authorization: `Bearer ${accessToken}`,
      //   },
      //   params: {
      //     dateFrom: dateFrom.toISOString().split('T')[0],
      //     dateTo: new Date().toISOString().split('T')[0],
      //   },
      // });

      // Mock response com transações de exemplo
      return this.generateMockTransactions(days);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Gera transações mock para demonstração
   */
  private generateMockTransactions(days: number): OpenBankingTransaction[] {
    const transactions: OpenBankingTransaction[] = [];
    const merchants = [
      { name: 'REWE Supermarkt', amount: -45.32 },
      { name: 'Amazon', amount: -89.99 },
      { name: 'Netflix', amount: -12.99 },
      { name: 'Spotify', amount: -9.99 },
      { name: 'Shell Tankstelle', amount: -65.00 },
      { name: 'Mediamarkt', amount: -234.50 },
      { name: 'Salary Payment', amount: 3500.00 },
      { name: 'EDEKA', amount: -56.78 },
      { name: 'Vodafone', amount: -39.99 },
      { name: 'Strom Payment', amount: -120.00 },
      { name: 'Restaurant Bella Italia', amount: -45.80 },
      { name: 'Uber', amount: -15.50 },
      { name: 'Apotheke', amount: -23.45 },
      { name: 'H&M', amount: -67.90 },
    ];

    let balance = 5430.50;

    for (let i = 0; i < days * 2; i++) {
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const daysAgo = Math.floor(Math.random() * days);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const amount = merchant.amount + (Math.random() * 20 - 10);

      transactions.push({
        transaction_id: uuidv4(),
        booking_date: date.toISOString().split('T')[0],
        value_date: date.toISOString().split('T')[0],
        transaction_amount: {
          amount: Number(amount.toFixed(2)),
          currency: 'EUR',
        },
        creditor_name: amount > 0 ? merchant.name : undefined,
        debtor_name: amount < 0 ? merchant.name : undefined,
        remittance_information: merchant.name,
        balance_after_transaction: {
          amount: Number(balance.toFixed(2)),
          currency: 'EUR',
        },
        status: 'BOOK',
      });

      balance -= amount;
    }

    return transactions.sort((a, b) =>
      new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
    );
  }

  /**
   * Revoga o acesso (desconecta a conta)
   */
  async revokeConsent(accessToken: string): Promise<void> {
    try {
      // Em produção:
      // await this.client.delete('/auth/consent', {
      //   headers: {
      //     Authorization: `Bearer ${accessToken}`,
      //   },
      // });

      console.log('Consent revoked successfully');
    } catch (error) {
      console.error('Error revoking consent:', error);
      throw new Error('Failed to revoke bank consent');
    }
  }
}

export default new OpenBankingService();
