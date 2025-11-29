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
    this.clientId = (process.env.PLUGGY_CLIENT_ID || '').trim();
    this.clientSecret = (process.env.PLUGGY_CLIENT_SECRET || '').trim();

    const baseURL = process.env.PLUGGY_BASE_URL || 'https://api.pluggy.ai';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('[Pluggy] Service initialized');

    if (!this.clientId || !this.clientSecret) {
      console.error('[Pluggy] ❌ Credentials missing - check PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET');
    }
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
      const response = await this.client.post('/auth', {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      this.apiKey = response.data.apiKey as string;
      // API Key do Pluggy não expira, mas vamos renovar a cada 24h por segurança
      this.apiKeyExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

      return this.apiKey;
    } catch (error: any) {
      console.error('[Pluggy] ❌ Error obtaining API Key:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Pluggy: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Lista conectores (bancos) disponíveis
   * Filtra por isOpenFinance=true para mostrar apenas bancos regulados pelo Banco Central
   */
  async getConnectors(country: string = 'BR'): Promise<any[]> {
    try {
      const apiKey = await this.getApiKey();

      const response = await this.client.get('/connectors', {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: {
          countries: country,
          isOpenFinance: true, // Filtrar apenas bancos Open Finance (regulados pelo BC)
        },
      });

      return response.data.results || [];
    } catch (error: any) {
      throw new Error('Failed to fetch available banks');
    }
  }

  /**
   * Inicia o processo de autenticação
   */
  async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
    try {
      const apiKey = await this.getApiKey();

      // Validar se o connector ID é um número válido
      const connectorId = parseInt(request.bank_id);
      if (isNaN(connectorId)) {
        throw new Error(`Invalid connector ID: ${request.bank_id}`);
      }

      // Criar um Connect Token no Pluggy
      // Este token será usado no Pluggy Connect Widget
      const tokenResponse = await this.client.post(
        '/connect_token',
        {
          itemId: null, // null para criar novo item
          options: {
            connectorId: connectorId, // Pré-selecionar o conector
            clientUserId: request.user_id || 'demo_user', // ID do usuário na sua aplicação
          },
        },
        {
          headers: {
            'X-API-KEY': apiKey,
          },
        }
      );

      const connectToken = tokenResponse.data.accessToken;

      // Gerar URL de autenticação do Pluggy Connect Widget
      const authUrl = `https://connect.pluggy.ai?connectToken=${connectToken}`;

      return {
        authorization_url: authUrl,
        state: connectToken, // Usar o connect token como state
        consent_id: connectToken,
      };
    } catch (error: any) {
      console.error('[Pluggy] ❌ Error initiating auth');
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error('Failed to initiate bank authorization: ' + errorMessage);
    }
  }

  /**
   * Cria um connect token sem pré-selecionar banco
   * O widget do Pluggy mostrará a lista completa de bancos
   */
  async createDirectConnectToken(userId: string): Promise<{ connectToken: string }> {
    try {
      const apiKey = await this.getApiKey();

      const tokenResponse = await this.client.post(
        '/connect_token',
        {
          itemId: null,
          options: {
            clientUserId: userId,
            // NÃO especificar connectorId - widget mostrará todos os bancos
          },
        },
        {
          headers: {
            'X-API-KEY': apiKey,
          },
        }
      );

      return {
        connectToken: tokenResponse.data.accessToken,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error('Failed to create connect token: ' + errorMessage);
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
      throw new Error('Failed to fetch item data');
    }
  }

  /**
   * No Pluggy, o itemId funciona como "token" de acesso
   */
  async exchangeCodeForToken(itemId: string): Promise<OpenBankingTokenResponse> {
    try {
      // Aguardar o item ficar pronto (Pluggy precisa sincronizar após login)
      const item = await this.waitForItemReady(itemId);

      if (item.status === 'LOGIN_ERROR') {
        throw new Error('Login failed at bank. Please try again.');
      }

      return {
        access_token: itemId, // Usamos o itemId como token
        refresh_token: itemId,
        expires_in: 7776000, // 90 dias
        token_type: 'Bearer',
      };
    } catch (error) {
      throw new Error('Failed to process authorization');
    }
  }

  /**
   * Aguarda o Item do Pluggy ficar pronto para uso
   * O Pluggy precisa de alguns segundos para processar após o login
   */
  private async waitForItemReady(itemId: string, maxAttempts: number = 30): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const item = await this.getItem(itemId);

        // Status finais (sucesso ou erro definitivo)
        if (item.status === 'UPDATED') {
          return item;
        }

        if (item.status === 'LOGIN_ERROR') {
          const errorMessage = item.error?.message || 'Login failed at bank';
          throw new Error(`Erro no login do banco: ${errorMessage}. Verifique suas credenciais e tente novamente.`);
        }

        // Verificar se há erro na sincronização
        if (item.executionStatus === 'ERROR' || item.executionStatus === 'MERGE_ERROR') {
          const errorMessage = item.error?.message || 'Falha na sincronização dos dados';
          throw new Error(`Erro ao sincronizar dados do banco: ${errorMessage}`);
        }

        // Status temporários que indicam processamento
        if (item.status === 'WAITING_USER_INPUT' || item.status === 'WAITING_USER_ACTION') {
          // Continua aguardando
        }

        // Aguardar 2 segundos antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Se for erro de rede/API, tentar novamente
        if (error instanceof Error && !error.message.startsWith('Erro')) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        // Se for erro de negócio, repassar
        throw error;
      }
    }

    // Timeout após todas as tentativas
    throw new Error(
      'Tempo limite excedido aguardando sincronização do banco. ' +
      'Isso pode acontecer se o banco estiver fora do ar ou com problemas. ' +
      'Tente novamente mais tarde.'
    );
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
      throw new Error('Failed to fetch bank accounts');
    }
  }

  /**
   * Busca transações de uma conta (com paginação automática)
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

      // Buscar TODAS as transações com paginação automática
      let allTransactions: any[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 500; // Máximo por página no Pluggy

      while (hasMore) {
        const response = await this.client.get('/transactions', {
          headers: {
            'X-API-KEY': apiKey,
          },
          params: {
            accountId,
            from: dateFrom.toISOString().split('T')[0],
            to: dateTo.toISOString().split('T')[0],
            pageSize,
            page,
          },
        });

        const transactions = response.data.results || [];
        allTransactions = allTransactions.concat(transactions);

        // Verificar se há mais páginas
        const total = response.data.total || 0;
        hasMore = allTransactions.length < total;
        page++;

        // Segurança: limitar a 100 páginas (50.000 transações)
        if (page > 100) {
          break;
        }
      }

      return allTransactions
        .map((transaction: any) => this.mapTransaction(transaction))
        .sort((a: OpenBankingTransaction, b: OpenBankingTransaction) =>
          new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
        );
    } catch (error) {
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
      throw new Error('Failed to update item');
    }
  }
}

export default new PluggyService();
