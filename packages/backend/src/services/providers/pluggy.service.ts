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

    console.log('==================================================');
    console.log('[Pluggy] Service initialized - DETAILED DEBUG');
    console.log('==================================================');
    console.log('   OPEN_BANKING_PROVIDER:', process.env.OPEN_BANKING_PROVIDER);
    console.log('   Base URL:', baseURL);
    console.log('   Client ID (first 12 chars):', this.clientId.substring(0, 12) + '...');
    console.log('   Client ID length:', this.clientId.length);
    console.log('   Client ID exists?', !!this.clientId);
    console.log('   Client Secret (first 8 chars):', this.clientSecret.substring(0, 8) + '...');
    console.log('   Client Secret length:', this.clientSecret.length);
    console.log('   Client Secret exists?', !!this.clientSecret);
    console.log('==================================================');

    if (!this.clientId || !this.clientSecret) {
      console.error('');
      console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
      console.error('❌ PLUGGY CREDENTIALS MISSING!');
      console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
      console.error('');
      console.error('   PLUGGY_CLIENT_ID:', this.clientId ? 'SET ✅' : 'MISSING ❌');
      console.error('   PLUGGY_CLIENT_SECRET:', this.clientSecret ? 'SET ✅' : 'MISSING ❌');
      console.error('');
      console.error('   Without these credentials, Pluggy will NOT work!');
      console.error('   The app will fall back to STATIC/MOCK banks.');
      console.error('');
      console.error('   To fix: Add these environment variables in Render:');
      console.error('   - PLUGGY_CLIENT_ID=your_client_id');
      console.error('   - PLUGGY_CLIENT_SECRET=your_client_secret');
      console.error('');
      console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
      console.error('');
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

      // Validar se o connector ID é um número válido
      const connectorId = parseInt(request.bank_id);
      if (isNaN(connectorId)) {
        throw new Error(`Invalid connector ID: ${request.bank_id}`);
      }

      // Criar um Connect Token no Pluggy
      // Este token será usado no Pluggy Connect Widget
      console.log(`[Pluggy] Creating connect token for connector ID: ${connectorId}`);
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
      console.log(`[Pluggy] ✅ Connect token created successfully!`);
      console.log(`[Pluggy] Connect token: ${connectToken}`);

      // Gerar URL de autenticação do Pluggy Connect Widget
      // Documentação: https://docs.pluggy.ai/docs/pluggy-connect
      // O token deve ser passado diretamente na URL sem encoding
      const authUrl = `https://connect.pluggy.ai?connectToken=${connectToken}&includeSandbox=true`;

      console.log(`[Pluggy] Auth URL generated: ${authUrl.substring(0, 60)}...`);
      console.log(`[Pluggy] User will be redirected to Pluggy Connect Widget`);

      return {
        authorization_url: authUrl,
        state: connectToken, // Usar o connect token como state
        consent_id: connectToken,
      };
    } catch (error: any) {
      console.error('[Pluggy] ❌ Error initiating auth:');
      console.error('[Pluggy]    Status:', error.response?.status);
      console.error('[Pluggy]    Message:', error.response?.data?.message || error.message);

      if (error.response?.data) {
        console.error('[Pluggy]    Details:', JSON.stringify(error.response.data, null, 2));
      }

      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error('Failed to initiate bank authorization: ' + errorMessage);
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
      // Aguardar o item ficar pronto (Pluggy precisa sincronizar após login)
      const item = await this.waitForItemReady(itemId);

      if (item.status === 'LOGIN_ERROR') {
        console.error('[Pluggy] Item has LOGIN_ERROR status');
        throw new Error('Login failed at bank. Please try again.');
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
   * Aguarda o Item do Pluggy ficar pronto para uso
   * O Pluggy precisa de alguns segundos para processar após o login
   */
  private async waitForItemReady(itemId: string, maxAttempts: number = 30): Promise<any> {
    console.log(`[Pluggy] Waiting for item ${itemId} to be ready...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const item = await this.getItem(itemId);
        console.log(`[Pluggy] Attempt ${attempt}/${maxAttempts} - Status: ${item.status}`);
        console.log(`[Pluggy]    executionStatus: ${item.executionStatus}`);
        console.log(`[Pluggy]    error: ${item.error ? JSON.stringify(item.error) : 'none'}`);

        // Status finais (sucesso ou erro definitivo)
        if (item.status === 'UPDATED') {
          console.log(`[Pluggy] ✅ Item ready with status: ${item.status}`);
          return item;
        }

        if (item.status === 'LOGIN_ERROR') {
          console.error(`[Pluggy] ❌ Item has LOGIN_ERROR status`);
          const errorMessage = item.error?.message || 'Login failed at bank';
          throw new Error(`Erro no login do banco: ${errorMessage}. Verifique suas credenciais e tente novamente.`);
        }

        // Verificar se há erro na sincronização
        if (item.executionStatus === 'ERROR' || item.executionStatus === 'MERGE_ERROR') {
          console.error(`[Pluggy] ❌ Item has ${item.executionStatus} status`);
          const errorMessage = item.error?.message || 'Falha na sincronização dos dados';
          throw new Error(`Erro ao sincronizar dados do banco: ${errorMessage}`);
        }

        // Status temporários que indicam processamento
        if (item.status === 'WAITING_USER_INPUT' || item.status === 'WAITING_USER_ACTION') {
          console.warn(`[Pluggy] ⚠️ Item waiting for user action: ${item.status}`);
          // Continua aguardando
        }

        // Aguardar 2 segundos antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Se for erro de rede/API, tentar novamente
        if (error instanceof Error && !error.message.startsWith('Erro')) {
          console.error(`[Pluggy] ⚠️ Error checking item status (will retry):`, error.message);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        // Se for erro de negócio, repassar
        throw error;
      }
    }

    // Timeout após todas as tentativas
    console.error(`[Pluggy] ❌ Timeout waiting for item ${itemId} after ${maxAttempts * 2}s`);
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
      console.error('Error fetching Pluggy accounts:', error);
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

      console.log(`[Pluggy] Fetching transactions for account ${accountId} from ${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`);

      // Buscar TODAS as transações com paginação automática
      let allTransactions: any[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 500; // Máximo por página no Pluggy

      while (hasMore) {
        console.log(`[Pluggy] Fetching page ${page}...`);

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

        console.log(`[Pluggy] Page ${page}: ${transactions.length} transactions (total so far: ${allTransactions.length})`);

        // Verificar se há mais páginas
        const total = response.data.total || 0;
        hasMore = allTransactions.length < total;
        page++;

        // Segurança: limitar a 100 páginas (50.000 transações)
        if (page > 100) {
          console.warn(`[Pluggy] ⚠️ Reached page limit of 100, stopping pagination`);
          break;
        }
      }

      console.log(`[Pluggy] ✅ Fetched total of ${allTransactions.length} transactions`);

      return allTransactions
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
