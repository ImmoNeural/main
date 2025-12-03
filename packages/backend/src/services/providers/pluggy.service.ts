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
      timeout: 120000, // 2 minutos de timeout para requisições
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
   * Inclui retry para casos onde o item ainda não está disponível
   */
  async getItem(itemId: string, retries: number = 5): Promise<any> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const apiKey = await this.getApiKey();

        console.log(`[Pluggy] Getting item ${itemId} (attempt ${attempt}/${retries})...`);

        const response = await this.client.get(`/items/${itemId}`, {
          headers: {
            'X-API-KEY': apiKey,
          },
          timeout: 60000, // 60 segundos timeout (bancos lentos como Itaú)
        });

        console.log(`[Pluggy] Item ${itemId} found. Status: ${response.data.status}`);
        return response.data;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        const statusCode = error.response?.status;

        console.error(`[Pluggy] ❌ Attempt ${attempt} failed to get item ${itemId}: ${errorMessage} (status: ${statusCode})`);

        // Se for erro 404 (item não encontrado), pode ser que ainda não foi criado
        // Aguardar e tentar novamente
        if (statusCode === 404 && attempt < retries) {
          console.log(`[Pluggy] Item not found yet, waiting 5s before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Se for erro de rede/timeout, tentar novamente
        if ((error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') && attempt < retries) {
          console.log(`[Pluggy] Network timeout, waiting 3s before retry...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        // Para outros erros, não tentar novamente
        if (attempt === retries) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Todas as tentativas falharam
    const errorMessage = lastError?.response?.data?.message || lastError?.message || 'Unknown error';
    throw new Error(`Erro ao buscar dados do item: ${errorMessage}`);
  }

  /**
   * No Pluggy, o itemId funciona como "token" de acesso
   * @param itemId - ID do item no Pluggy
   * @param quickMode - Se true, retorna imediatamente sem esperar sync (evita 504)
   */
  async exchangeCodeForToken(itemId: string, quickMode: boolean = false): Promise<OpenBankingTokenResponse> {
    try {
      console.log(`[Pluggy] Processando item ${itemId} (quickMode: ${quickMode})...`);

      if (quickMode) {
        // Modo rápido: apenas verifica se o item existe e retorna
        // Não espera a sincronização completar (evita timeout 504)
        const item = await this.getItem(itemId);

        if (item.status === 'LOGIN_ERROR') {
          throw new Error('Login falhou no banco. Por favor, tente novamente.');
        }

        console.log(`[Pluggy] ✅ Item ${itemId} encontrado (quickMode). Status: ${item.status}`);

        return {
          access_token: itemId,
          refresh_token: itemId,
          expires_in: 7776000, // 90 dias
          token_type: 'Bearer',
          // Adicionar info extra sobre status
          item_status: item.status,
        } as OpenBankingTokenResponse & { item_status?: string };
      }

      // Modo normal: aguarda o item ficar pronto
      const item = await this.waitForItemReady(itemId);

      if (item.status === 'LOGIN_ERROR') {
        throw new Error('Login falhou no banco. Por favor, tente novamente.');
      }

      console.log(`[Pluggy] ✅ Item ${itemId} pronto! Status: ${item.status}`);

      return {
        access_token: itemId,
        refresh_token: itemId,
        expires_in: 7776000, // 90 dias
        token_type: 'Bearer',
      };
    } catch (error: any) {
      console.error(`[Pluggy] ❌ Erro ao processar item ${itemId}:`, error.message);
      throw error;
    }
  }

  /**
   * Aguarda o Item do Pluggy ficar pronto para uso
   * O Pluggy precisa de alguns segundos para processar após o login
   * Timeout: 5 minutos (150 tentativas * 2 segundos) para bancos lentos como Itaú Personalité
   */
  private async waitForItemReady(itemId: string, maxAttempts: number = 150): Promise<any> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const item = await this.getItem(itemId);

        console.log(`[Pluggy] Item ${itemId} - Tentativa ${attempt}/${maxAttempts} - Status: ${item.status}, ExecutionStatus: ${item.executionStatus || 'N/A'}`);

        // Status finais (sucesso ou erro definitivo)
        if (item.status === 'UPDATED') {
          console.log(`[Pluggy] ✅ Item ${itemId} sincronizado com sucesso!`);
          return item;
        }

        if (item.status === 'LOGIN_ERROR') {
          const errorMessage = item.error?.message || 'Login falhou no banco';
          throw new Error(`Erro no login do banco: ${errorMessage}. Verifique suas credenciais e tente novamente.`);
        }

        // Verificar se há erro na sincronização
        if (item.executionStatus === 'ERROR' || item.executionStatus === 'MERGE_ERROR') {
          const errorMessage = item.error?.message || 'Falha na sincronização dos dados';
          throw new Error(`Erro ao sincronizar dados do banco: ${errorMessage}`);
        }

        // OUTDATED também é um status final válido (item foi sincronizado antes mas precisa atualização)
        if (item.status === 'OUTDATED') {
          console.log(`[Pluggy] ⚠️ Item ${itemId} está desatualizado, mas podemos usar`);
          return item;
        }

        // Status temporários que indicam processamento
        // UPDATING, WAITING_USER_INPUT, WAITING_USER_ACTION, etc.

        // Aguardar 2 segundos antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        // Se for erro de rede/API (não de negócio), tentar novamente
        if (!error.message?.startsWith('Erro')) {
          console.log(`[Pluggy] ⚠️ Erro temporário na tentativa ${attempt}, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        // Se for erro de negócio, repassar
        throw error;
      }
    }

    // Timeout após todas as tentativas (5 min)
    throw new Error(
      'Tempo limite excedido (5 min) aguardando sincronização do banco. ' +
      'Alguns bancos podem demorar mais. ' +
      'Verifique se o banco confirmou a conexão e tente sincronizar novamente na página Contas.'
    );
  }

  /**
   * Busca contas vinculadas ao Item
   */
  async getAccounts(itemId: string): Promise<OpenBankingAccount[]> {
    try {
      const apiKey = await this.getApiKey();

      console.log(`[Pluggy] Fetching accounts for item ${itemId}...`);

      const response = await this.client.get('/accounts', {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: {
          itemId,
        },
      });

      const accounts = response.data.results || [];
      console.log(`[Pluggy] Found ${accounts.length} accounts for item ${itemId}`);

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
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error(`[Pluggy] ❌ Error fetching accounts for item ${itemId}:`, errorMessage);

      // Se o item ainda não está pronto, retornar mensagem mais clara
      if (errorMessage.includes('not found') || errorMessage.includes('UPDATING')) {
        throw new Error('Item ainda está sendo sincronizado. Aguarde alguns segundos.');
      }

      throw new Error(`Erro ao buscar contas: ${errorMessage}`);
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
