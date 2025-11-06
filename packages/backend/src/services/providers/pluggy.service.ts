import axios, { AxiosInstance } from 'axios';
import {
  OpenBankingAuthRequest,
  OpenBankingAuthResponse,
  OpenBankingTokenResponse,
  OpenBankingAccount,
  OpenBankingTransaction
} from '../../types';

/**
 * Serviço de integração com Pluggy (Brasil)
 *
 * Pluggy é o provedor líder de Open Banking no Brasil.
 * Funciona com todos os principais bancos brasileiros.
 *
 * Como obter credenciais:
 * 1. Crie uma conta em: https://dashboard.pluggy.ai/signup
 * 2. Crie uma aplicação no Dashboard
 * 3. Obtenha seu Client ID e Client Secret
 * 4. Configure no arquivo .env
 *
 * Documentação: https://docs.pluggy.ai/
 */
export class PluggyService {
  private client: AxiosInstance;
  private clientId: string;
  private clientSecret: string;
  private apiKey: string | null = null;
  private apiKeyExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.PLUGGY_CLIENT_ID || '';
    this.clientSecret = process.env.PLUGGY_CLIENT_SECRET || '';

    const baseURL = process.env.PLUGGY_BASE_URL || 'https://api.pluggy.ai';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Obtém ou renova a API Key
   */
  private async getApiKey(): Promise<string> {
    // Se já temos uma API Key válida, retorna ela
    if (this.apiKey && Date.now() < this.apiKeyExpiresAt) {
      console.log('[Pluggy] Using cached API Key');
      return this.apiKey;
    }

    try {
      console.log('[Pluggy] Authenticating with Client ID:', this.clientId.substring(0, 8) + '...');
      const response = await this.client.post('/auth', {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      this.apiKey = response.data.apiKey as string;
      // API Key do Pluggy não expira, mas vamos renovar a cada 24h por segurança
      this.apiKeyExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

      console.log('[Pluggy] ✅ Authentication successful!');
      return this.apiKey;
    } catch (error: any) {
      console.error('[Pluggy] ❌ Error obtaining API Key:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Pluggy: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Lista conectores (bancos) disponíveis
   */
  async getConnectors(country: string = 'BR'): Promise<any[]> {
    try {
      console.log(`[Pluggy] Fetching connectors for country: ${country}`);
      const apiKey = await this.getApiKey();

      const response = await this.client.get('/connectors', {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: {
          countries: country,
        },
      });

      const connectors = response.data.results || [];
      console.log(`[Pluggy] Found ${connectors.length} connectors`);

      // Log primeiro banco para debug
      if (connectors.length > 0) {
        console.log(`[Pluggy] Example connector:`, {
          id: connectors[0].id,
          name: connectors[0].name,
          type: connectors[0].type
        });
      }

      return connectors;
    } catch (error: any) {
      console.error('[Pluggy] Error fetching connectors:', error.response?.data || error.message);
      throw new Error('Failed to fetch available banks');
    }
  }

  /**
   * Inicia o processo de autenticação
   */
  async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
    try {
      console.log(`[Pluggy] Initiating auth for bank ID: ${request.bank_id}`);
      const apiKey = await this.getApiKey();

      // Criar um Item no Pluggy (conexão com o banco)
      console.log(`[Pluggy] Creating item with connector ID: ${request.bank_id}`);
      const response = await this.client.post(
        '/items',
        {
          connectorId: parseInt(request.bank_id), // Converter para número
          parameters: {},
        },
        {
          headers: {
            'X-API-KEY': apiKey,
          },
        }
      );

      const item = response.data;
      console.log(`[Pluggy] ✅ Item created successfully! Item ID: ${item.id}`);

      // Pluggy Connect Widget URL
      // Em produção, você usaria o Widget do Pluggy
      // Por enquanto, vamos usar a URL de autenticação manual
      const authUrl = `https://connect.pluggy.ai?itemId=${item.id}&clientId=${this.clientId}&redirectUrl=${encodeURIComponent(request.redirect_uri)}`;

      console.log(`[Pluggy] Auth URL generated: ${authUrl.substring(0, 80)}...`);

      return {
        authorization_url: authUrl,
        state: item.id,
        consent_id: item.id,
      };
    } catch (error: any) {
      console.error('[Pluggy] ❌ Error initiating auth:', error.response?.data || error.message);
      throw new Error('Failed to initiate bank authorization: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Obtém informações do Item após autorização
   */
  async getItem(itemId: string): Promise<any> {
    try {
      const apiKey = await this.getApiKey();

      const response = await this.client.get(`/items/${itemId}`, {
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Pluggy item:', error);
      throw new Error('Failed to fetch item data');
    }
  }

  /**
   * No Pluggy, o itemId funciona como "token" de acesso
   */
  async exchangeCodeForToken(itemId: string): Promise<OpenBankingTokenResponse> {
    try {
      // Verificar se o item existe e está conectado
      const item = await this.getItem(itemId);

      if (item.status !== 'UPDATED' && item.status !== 'LOGIN_ERROR') {
        throw new Error(`Item status is ${item.status}. Expected UPDATED.`);
      }

      return {
        access_token: itemId, // Usamos o itemId como token
        refresh_token: itemId,
        expires_in: 7776000, // 90 dias
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Error processing Pluggy item:', error);
      throw new Error('Failed to process authorization');
    }
  }

  /**
   * Busca contas vinculadas ao Item
   */
  async getAccounts(itemId: string): Promise<OpenBankingAccount[]> {
    try {
      const apiKey = await this.getApiKey();

      const response = await this.client.get('/accounts', {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: {
          itemId,
        },
      });

      const accounts = response.data.results || [];

      return accounts.map((account: any) => ({
        id: account.id,
        iban: account.number || undefined,
        currency: account.currencyCode || 'BRL',
        name: account.name || account.type,
        account_type: this.mapAccountType(account.type),
        balance: {
          amount: account.balance || 0,
          currency: account.currencyCode || 'BRL',
        },
      }));
    } catch (error) {
      console.error('Error fetching Pluggy accounts:', error);
      throw new Error('Failed to fetch bank accounts');
    }
  }

  /**
   * Busca transações de uma conta
   */
  async getTransactions(
    itemId: string,
    accountId: string,
    days: number = 90
  ): Promise<OpenBankingTransaction[]> {
    try {
      const apiKey = await this.getApiKey();

      // Calcular data inicial
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const response = await this.client.get('/transactions', {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: {
          accountId,
          from: dateFrom.toISOString().split('T')[0],
          to: dateTo.toISOString().split('T')[0],
        },
      });

      const transactions = response.data.results || [];

      return transactions
        .map((transaction: any) => this.mapTransaction(transaction))
        .sort((a: OpenBankingTransaction, b: OpenBankingTransaction) =>
          new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
        );
    } catch (error) {
      console.error('Error fetching Pluggy transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Deleta um Item (desconecta a conta)
   */
  async revokeConsent(itemId: string): Promise<void> {
    try {
      const apiKey = await this.getApiKey();

      await this.client.delete(`/items/${itemId}`, {
        headers: {
          'X-API-KEY': apiKey,
        },
      });
    } catch (error) {
      console.error('Error revoking Pluggy consent:', error);
      throw new Error('Failed to revoke consent');
    }
  }

  /**
   * Mapeia tipo de conta do Pluggy para nosso formato
   */
  private mapAccountType(pluggyType?: string): string {
    const mapping: { [key: string]: string } = {
      'BANK': 'checking',
      'CREDIT': 'card',
      'CHECKING': 'checking',
      'SAVINGS': 'savings',
      'INVESTMENT': 'investment',
    };

    const upperType = (pluggyType || 'BANK').toUpperCase();
    return mapping[upperType] || 'checking';
  }

  /**
   * Mapeia transação do Pluggy para nosso formato
   */
  private mapTransaction(transaction: any): OpenBankingTransaction {
    const amount = transaction.amount || 0;
    const date = transaction.date || new Date().toISOString();

    return {
      transaction_id: transaction.id,
      booking_date: date.split('T')[0],
      value_date: date.split('T')[0],
      transaction_amount: {
        amount,
        currency: transaction.currencyCode || 'BRL',
      },
      creditor_name: amount > 0 ? transaction.description : undefined,
      debtor_name: amount < 0 ? transaction.description : undefined,
      remittance_information: transaction.description || '',
      balance_after_transaction: transaction.balance ? {
        amount: transaction.balance,
        currency: transaction.currencyCode || 'BRL',
      } : undefined,
      status: transaction.status === 'POSTED' ? 'BOOK' : 'PDNG',
    };
  }

  /**
   * Atualiza um Item (sincroniza dados)
   */
  async updateItem(itemId: string): Promise<void> {
    try {
      const apiKey = await this.getApiKey();

      await this.client.patch(
        `/items/${itemId}`,
        {},
        {
          headers: {
            'X-API-KEY': apiKey,
          },
        }
      );
    } catch (error) {
      console.error('Error updating Pluggy item:', error);
      throw new Error('Failed to update item');
    }
  }
}

export default new PluggyService();
