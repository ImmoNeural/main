import axios, { AxiosInstance } from 'axios';
import {
  OpenBankingAuthRequest,
  OpenBankingAuthResponse,
  OpenBankingTokenResponse,
  OpenBankingAccount,
  OpenBankingTransaction
} from '../../types';

/**
 * Serviço de integração com Tink
 *
 * Tink é um dos provedores mais populares de Open Banking na Europa.
 * Oferece excelente cobertura de bancos, incluindo Deutsche Bank.
 *
 * Como obter credenciais:
 * 1. Crie uma conta em: https://console.tink.com/
 * 2. Crie uma aplicação no Console
 * 3. Obtenha seu Client ID e Client Secret
 * 4. Configure os Redirect URIs
 *
 * Documentação: https://docs.tink.com/
 */
export class TinkService {
  private client: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.TINK_CLIENT_ID || '';
    this.clientSecret = process.env.TINK_CLIENT_SECRET || '';

    this.client = axios.create({
      baseURL: process.env.TINK_API_URL || 'https://api.tink.com',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });
  }

  /**
   * Obtém ou renova o token de acesso da API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'authorization:grant user:read accounts:read transactions:read');

      const response = await this.client.post('/api/v1/oauth/token', params);

      this.accessToken = response.data.access_token as string;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Error obtaining Tink access token:', error);
      throw new Error('Failed to authenticate with Tink');
    }
  }

  /**
   * Lista provedores (bancos) disponíveis
   */
  async getProviders(country: string = 'DE'): Promise<any[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/api/v1/providers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          market: country,
          capability: 'ACCOUNTS,TRANSACTIONS',
        },
      });

      return response.data.providers || [];
    } catch (error) {
      console.error('Error fetching Tink providers:', error);
      throw new Error('Failed to fetch available providers');
    }
  }

  /**
   * Inicia o processo de autenticação
   */
  async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
    try {
      const token = await this.getAccessToken();

      // Criar um usuário temporário no Tink
      const userResponse = await this.client.post(
        '/api/v1/user/create',
        {
          external_user_id: request.user_id,
          market: 'DE',
          locale: 'de_DE',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const userId = userResponse.data.user_id;

      // Criar authorization code para o usuário
      const authResponse = await this.client.post(
        '/api/v1/oauth/authorization-grant',
        {
          user_id: userId,
          scope: 'accounts:read,transactions:read',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const authCode = authResponse.data.code;

      // Construir URL de autorização
      const authUrl = new URL('https://link.tink.com/1.0/authorize');
      authUrl.searchParams.set('client_id', this.clientId);
      authUrl.searchParams.set('redirect_uri', request.redirect_uri);
      authUrl.searchParams.set('market', 'DE');
      authUrl.searchParams.set('locale', 'de_DE');
      authUrl.searchParams.set('authorization_code', authCode);

      // Se um banco específico for especificado
      if (request.bank_id) {
        authUrl.searchParams.set('provider_name', request.bank_id);
      }

      return {
        authorization_url: authUrl.toString(),
        state: authCode,
        consent_id: userId,
      };
    } catch (error: any) {
      console.error('Error initiating Tink auth:', error.response?.data || error);
      throw new Error('Failed to initiate bank authorization');
    }
  }

  /**
   * Troca o código de autorização por tokens
   */
  async exchangeCodeForToken(code: string): Promise<OpenBankingTokenResponse> {
    try {
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'authorization_code');

      const response = await this.client.post('/api/v1/oauth/token', params);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Error exchanging Tink code for token:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Renova o token de acesso
   */
  async refreshAccessToken(refreshToken: string): Promise<OpenBankingTokenResponse> {
    try {
      const params = new URLSearchParams();
      params.append('refresh_token', refreshToken);
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'refresh_token');

      const response = await this.client.post('/api/v1/oauth/token', params);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Error refreshing Tink token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Busca contas do usuário
   */
  async getAccounts(accessToken: string): Promise<OpenBankingAccount[]> {
    try {
      const response = await this.client.get('/data/v2/accounts', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const accounts = response.data.accounts || [];

      return accounts.map((account: any) => ({
        id: account.id,
        iban: account.identifiers?.iban?.iban,
        currency: account.currencyCode || 'EUR',
        name: account.name || account.type,
        account_type: this.mapAccountType(account.type),
        balance: {
          amount: account.balance || 0,
          currency: account.currencyCode || 'EUR',
        },
      }));
    } catch (error) {
      console.error('Error fetching Tink accounts:', error);
      throw new Error('Failed to fetch bank accounts');
    }
  }

  /**
   * Busca transações de uma conta
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    days: number = 90
  ): Promise<OpenBankingTransaction[]> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const response = await this.client.get('/data/v2/transactions', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          accountIdIn: accountId,
        },
      });

      const transactions = response.data.transactions || [];

      return transactions
        .map((transaction: any) => this.mapTransaction(transaction))
        .sort((a: OpenBankingTransaction, b: OpenBankingTransaction) =>
          new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
        );
    } catch (error) {
      console.error('Error fetching Tink transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Revoga o consentimento
   */
  async revokeConsent(accessToken: string): Promise<void> {
    try {
      await this.client.post(
        '/api/v1/oauth/revoke',
        { token: accessToken },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error revoking Tink consent:', error);
      throw new Error('Failed to revoke consent');
    }
  }

  /**
   * Mapeia tipo de conta do Tink para nosso formato
   */
  private mapAccountType(tinkType?: string): string {
    const mapping: { [key: string]: string } = {
      'CHECKING': 'checking',
      'SAVINGS': 'savings',
      'CREDIT_CARD': 'card',
      'LOAN': 'loan',
      'INVESTMENT': 'investment',
    };

    return mapping[tinkType || ''] || 'checking';
  }

  /**
   * Mapeia transação do Tink para nosso formato
   */
  private mapTransaction(transaction: any): OpenBankingTransaction {
    const amount = transaction.amount || 0;

    return {
      transaction_id: transaction.id,
      booking_date: transaction.dates?.booked || transaction.dates?.value,
      value_date: transaction.dates?.value,
      transaction_amount: {
        amount,
        currency: transaction.currencyCode || 'EUR',
      },
      creditor_name: amount > 0 ? transaction.descriptions?.original : undefined,
      debtor_name: amount < 0 ? transaction.descriptions?.original : undefined,
      remittance_information:
        transaction.descriptions?.display ||
        transaction.descriptions?.original ||
        '',
      status: transaction.status === 'BOOKED' ? 'BOOK' : 'PDNG',
    };
  }
}

export default new TinkService();
