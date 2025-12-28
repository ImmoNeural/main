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
   * Cache reduzido para 1 hora para evitar problemas com keys inválidas
   */
  private async getApiKey(forceRefresh: boolean = false): Promise<string> {
    // Se forceRefresh=true, ignorar cache e buscar nova key
    if (!forceRefresh && this.apiKey && Date.now() < this.apiKeyExpiresAt) {
      console.log('[Pluggy] ✅ Using cached API Key');
      return this.apiKey;
    }

    console.log('[Pluggy] 🔑 Requesting new API Key...');

    try {
      const response = await this.client.post('/auth', {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      this.apiKey = response.data.apiKey as string;
      // Cache reduzido para 1 hora (antes era 24h)
      this.apiKeyExpiresAt = Date.now() + 1 * 60 * 60 * 1000;

      console.log('[Pluggy] ✅ API Key obtained successfully');
      return this.apiKey;
    } catch (error: any) {
      console.error('[Pluggy] ❌ Error obtaining API Key:', error.response?.data || error.message);
      console.error('[Pluggy] ❌ Status:', error.response?.status);
      console.error('[Pluggy] ❌ Headers:', JSON.stringify(error.response?.headers || {}));
      throw new Error('Failed to authenticate with Pluggy: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Invalida o cache da API Key (usado quando recebemos 403)
   */
  private invalidateApiKey(): void {
    console.log('[Pluggy] 🔄 Invalidating cached API Key');
    this.apiKey = null;
    this.apiKeyExpiresAt = 0;
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
    console.log('[Pluggy] 🚀 ====== INITIATE AUTH START ======');
    console.log('[Pluggy] 📋 Request:', JSON.stringify({
      bank_id: request.bank_id,
      user_id: request.user_id,
      redirect_uri: request.redirect_uri
    }));

    try {
      const apiKey = await this.getApiKey();

      // Validar se o connector ID é um número válido
      const connectorId = parseInt(request.bank_id);
      if (isNaN(connectorId)) {
        console.error(`[Pluggy] ❌ Invalid connector ID: ${request.bank_id}`);
        throw new Error(`Invalid connector ID: ${request.bank_id}`);
      }

      console.log(`[Pluggy] 📡 Creating connect token for connectorId: ${connectorId}`);

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
      console.log(`[Pluggy] ✅ Connect token created: ${connectToken.substring(0, 20)}...`);

      // Gerar URL de autenticação do Pluggy Connect Widget
      const authUrl = `https://connect.pluggy.ai?connectToken=${connectToken}`;
      console.log(`[Pluggy] 🔗 Auth URL generated`);
      console.log('[Pluggy] ✅ ====== INITIATE AUTH SUCCESS ======');

      return {
        authorization_url: authUrl,
        state: connectToken, // Usar o connect token como state
        consent_id: connectToken,
      };
    } catch (error: any) {
      console.error('[Pluggy] ❌ ====== INITIATE AUTH ERROR ======');
      console.error('[Pluggy] ❌ Error message:', error.message);
      console.error('[Pluggy] ❌ Status:', error.response?.status);
      console.error('[Pluggy] ❌ Response data:', JSON.stringify(error.response?.data || {}));
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error('Failed to initiate bank authorization: ' + errorMessage);
    }
  }

  /**
   * Cria um connect token sem pré-selecionar banco
   * O widget do Pluggy mostrará a lista completa de bancos
   */
  async createDirectConnectToken(userId: string): Promise<{ connectToken: string }> {
    console.log('[Pluggy] 🚀 ====== CREATE DIRECT CONNECT TOKEN START ======');
    console.log(`[Pluggy] 👤 User ID: ${userId}`);

    try {
      const apiKey = await this.getApiKey();

      console.log('[Pluggy] 📡 Creating connect token (no connector pre-selected)...');

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

      const connectToken = tokenResponse.data.accessToken;
      console.log(`[Pluggy] ✅ Direct connect token created: ${connectToken.substring(0, 20)}...`);
      console.log('[Pluggy] ✅ ====== CREATE DIRECT CONNECT TOKEN SUCCESS ======');

      return {
        connectToken: connectToken,
      };
    } catch (error: any) {
      console.error('[Pluggy] ❌ ====== CREATE DIRECT CONNECT TOKEN ERROR ======');
      console.error('[Pluggy] ❌ Error message:', error.message);
      console.error('[Pluggy] ❌ Status:', error.response?.status);
      console.error('[Pluggy] ❌ Response data:', JSON.stringify(error.response?.data || {}));
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error('Failed to create connect token: ' + errorMessage);
    }
  }

  /**
   * Obtém informações do Item após autorização
   * Inclui retry para casos onde o item ainda não está disponível
   * Se receber 403 (API Key inválida), invalida cache e tenta com nova key
   */
  async getItem(itemId: string, retries: number = 5): Promise<any> {
    console.log(`[Pluggy] 📦 ====== GET ITEM START ======`);
    console.log(`[Pluggy] 📦 Item ID: ${itemId}`);
    console.log(`[Pluggy] 📦 Max retries: ${retries}`);

    let lastError: any = null;
    let hasTriedFreshKey = false;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const apiKey = await this.getApiKey();

        console.log(`[Pluggy] 📦 Getting item ${itemId} (attempt ${attempt}/${retries})...`);

        const response = await this.client.get(`/items/${itemId}`, {
          headers: {
            'X-API-KEY': apiKey,
          },
          timeout: 60000, // 60 segundos timeout (bancos lentos como Itaú)
        });

        const item = response.data;
        console.log(`[Pluggy] 📦 Item ${itemId} retrieved successfully`);
        console.log(`[Pluggy] 📦 Item status: ${item.status}`);
        console.log(`[Pluggy] 📦 Execution status: ${item.executionStatus || 'N/A'}`);
        console.log(`[Pluggy] 📦 Connector ID: ${item.connector?.id || 'N/A'}`);
        console.log(`[Pluggy] 📦 Connector name: ${item.connector?.name || 'N/A'}`);
        if (item.error) {
          console.log(`[Pluggy] 📦 Item error: ${JSON.stringify(item.error)}`);
        }
        // Log statusDetail e warnings (pode explicar transações faltando)
        if (item.statusDetail) {
          console.log(`[Pluggy] 📦 Status detail: ${JSON.stringify(item.statusDetail)}`);
        }
        if (item.productWarnings && item.productWarnings.length > 0) {
          console.log(`[Pluggy] ⚠️ Product warnings: ${JSON.stringify(item.productWarnings)}`);
        }
        console.log(`[Pluggy] ✅ ====== GET ITEM SUCCESS ======`);

        return item;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        const statusCode = error.response?.status;

        console.error(`[Pluggy] ❌ Attempt ${attempt}/${retries} failed for item ${itemId}`);
        console.error(`[Pluggy] ❌ Error: ${errorMessage}`);
        console.error(`[Pluggy] ❌ Status code: ${statusCode}`);
        console.error(`[Pluggy] ❌ Error code: ${error.code || 'N/A'}`);

        // Se for erro 403 (API Key inválida), invalidar cache e tentar com nova key
        if (statusCode === 403 && !hasTriedFreshKey) {
          console.log(`[Pluggy] 🔄 API Key invalid (403), refreshing and retrying...`);
          this.invalidateApiKey();
          hasTriedFreshKey = true;
          // Buscar nova API Key imediatamente
          await this.getApiKey(true);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Se for erro 404 (item não encontrado), pode ser que ainda não foi criado
        // Aguardar e tentar novamente
        if (statusCode === 404 && attempt < retries) {
          console.log(`[Pluggy] ⏳ Item not found yet, waiting 5s before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Se for erro de rede/timeout, tentar novamente
        if ((error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') && attempt < retries) {
          console.log(`[Pluggy] ⏳ Network timeout, waiting 3s before retry...`);
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
    console.error(`[Pluggy] ❌ ====== GET ITEM FAILED ======`);
    console.error(`[Pluggy] ❌ All ${retries} attempts failed for item ${itemId}`);
    console.error(`[Pluggy] ❌ Last error: ${lastError?.message}`);
    console.error(`[Pluggy] ❌ Last status: ${lastError?.response?.status}`);
    console.error(`[Pluggy] ❌ Last response: ${JSON.stringify(lastError?.response?.data || {})}`);

    const errorMessage = lastError?.response?.data?.message || lastError?.message || 'Unknown error';
    throw new Error(`Erro ao buscar dados do item: ${errorMessage}`);
  }

  /**
   * No Pluggy, o itemId funciona como "token" de acesso
   * @param itemId - ID do item no Pluggy
   * @param quickMode - Se true, retorna imediatamente sem esperar sync (evita 504)
   */
  async exchangeCodeForToken(itemId: string, quickMode: boolean = false): Promise<OpenBankingTokenResponse> {
    console.log(`[Pluggy] 🔄 ====== EXCHANGE CODE FOR TOKEN START ======`);
    console.log(`[Pluggy] 🔄 Item ID: ${itemId}`);
    console.log(`[Pluggy] 🔄 Quick mode: ${quickMode}`);

    try {
      if (quickMode) {
        // Modo rápido: apenas verifica se o item existe e retorna
        // Não espera a sincronização completar (evita timeout 504)
        console.log(`[Pluggy] 🔄 Quick mode enabled - fetching item without waiting for sync...`);
        const item = await this.getItem(itemId);

        if (item.status === 'LOGIN_ERROR') {
          console.error(`[Pluggy] ❌ Item ${itemId} has LOGIN_ERROR status`);
          console.error(`[Pluggy] ❌ Item error details: ${JSON.stringify(item.error || {})}`);
          throw new Error('Login falhou no banco. Por favor, tente novamente.');
        }

        console.log(`[Pluggy] ✅ Item ${itemId} found (quickMode)`);
        console.log(`[Pluggy] ✅ Status: ${item.status}`);
        console.log(`[Pluggy] ✅ Execution status: ${item.executionStatus || 'N/A'}`);
        console.log(`[Pluggy] ✅ Connector: ${item.connector?.name || 'N/A'}`);
        console.log(`[Pluggy] ✅ Connector logo: ${item.connector?.imageUrl || 'N/A'}`);
        console.log(`[Pluggy] ✅ ====== EXCHANGE CODE FOR TOKEN SUCCESS (QUICK) ======`);

        return {
          access_token: itemId,
          refresh_token: itemId,
          expires_in: 7776000, // 90 dias
          token_type: 'Bearer',
          // Adicionar info extra sobre status e connector
          item_status: item.status,
          connector_logo_url: item.connector?.imageUrl || null,
          connector_name: item.connector?.name || null,
        } as OpenBankingTokenResponse & { item_status?: string; connector_logo_url?: string; connector_name?: string };
      }

      // Modo normal: aguarda o item ficar pronto
      console.log(`[Pluggy] 🔄 Normal mode - waiting for item to be ready...`);
      const item = await this.waitForItemReady(itemId);

      if (item.status === 'LOGIN_ERROR') {
        console.error(`[Pluggy] ❌ Item ${itemId} has LOGIN_ERROR status after waiting`);
        console.error(`[Pluggy] ❌ Item error details: ${JSON.stringify(item.error || {})}`);
        throw new Error('Login falhou no banco. Por favor, tente novamente.');
      }

      console.log(`[Pluggy] ✅ Item ${itemId} is ready!`);
      console.log(`[Pluggy] ✅ Final status: ${item.status}`);
      console.log(`[Pluggy] ✅ Connector: ${item.connector?.name || 'N/A'}`);
      console.log(`[Pluggy] ✅ Connector logo: ${item.connector?.imageUrl || 'N/A'}`);
      console.log(`[Pluggy] ✅ ====== EXCHANGE CODE FOR TOKEN SUCCESS ======`);

      return {
        access_token: itemId,
        refresh_token: itemId,
        expires_in: 7776000, // 90 dias
        token_type: 'Bearer',
        // Adicionar info extra sobre connector
        connector_logo_url: item.connector?.imageUrl || null,
        connector_name: item.connector?.name || null,
      } as OpenBankingTokenResponse & { connector_logo_url?: string; connector_name?: string };
    } catch (error: any) {
      console.error(`[Pluggy] ❌ ====== EXCHANGE CODE FOR TOKEN ERROR ======`);
      console.error(`[Pluggy] ❌ Item ID: ${itemId}`);
      console.error(`[Pluggy] ❌ Error: ${error.message}`);
      console.error(`[Pluggy] ❌ Stack: ${error.stack || 'N/A'}`);
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

      return accounts.map((account: any) => {
        // Extrair limite de crédito baseado no tipo de conta
        let credit_limit: number | undefined;
        let overdraft_limit: number | undefined;

        // Para cartões de crédito: creditData.creditLimit
        if (account.creditData?.creditLimit) {
          credit_limit = account.creditData.creditLimit;
          console.log(`[Pluggy] 💳 Credit card limit: R$ ${account.creditData.creditLimit.toFixed(2)}`);
        }

        // Para contas correntes: bankData.overdraftContractedLimit ou overdraftContractedLimitAmount
        if (account.bankData?.overdraftContractedLimit) {
          overdraft_limit = account.bankData.overdraftContractedLimit;
          console.log(`[Pluggy] 🏦 Overdraft limit: R$ ${account.bankData.overdraftContractedLimit.toFixed(2)}`);
        } else if (account.bankData?.overdraftContractedLimitAmount) {
          overdraft_limit = account.bankData.overdraftContractedLimitAmount;
          console.log(`[Pluggy] 🏦 Overdraft limit: R$ ${account.bankData.overdraftContractedLimitAmount.toFixed(2)}`);
        }

        return {
          id: account.id,
          iban: account.number || undefined,
          currency: account.currencyCode || 'BRL',
          name: account.name || account.type,
          account_type: this.mapAccountType(account.type),
          balance: {
            amount: account.balance || 0,
            currency: account.currencyCode || 'BRL',
          },
          credit_limit: credit_limit,
          overdraft_limit: overdraft_limit,
        };
      });
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
   * Inclui retry automático para erros 401/403 (token expirado)
   */
  async getTransactions(
    itemId: string,
    accountId: string,
    days: number = 90
  ): Promise<OpenBankingTransaction[]> {
    let hasTriedFreshKey = false;
    let lastError: any = null;

    // Tentar até 2 vezes (1 normal + 1 com fresh API key)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const apiKey = await this.getApiKey(hasTriedFreshKey);

        // Calcular data inicial
        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        console.log(`[Pluggy] 📊 Fetching transactions for account ${accountId} (attempt ${attempt}/2)`);
        console.log(`[Pluggy] 📊 Date range: ${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`);

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

          // Log warnings se existirem (pode explicar porque transações não são retornadas)
          if (response.data.warnings && response.data.warnings.length > 0) {
            console.log(`[Pluggy] ⚠️ API Warnings:`, JSON.stringify(response.data.warnings));
          }

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

        console.log(`[Pluggy] ✅ Fetched ${allTransactions.length} transactions from Pluggy`);

        // DEBUG: Mostrar distribuição de datas das transações
        if (allTransactions.length > 0) {
          const dateDistribution: Record<string, number> = {};
          for (const t of allTransactions) {
            const date = t.date?.split('T')[0] || 'unknown';
            const month = date.substring(0, 7); // YYYY-MM
            dateDistribution[month] = (dateDistribution[month] || 0) + 1;
          }
          console.log(`[Pluggy] 📅 Transaction date distribution:`, JSON.stringify(dateDistribution));

          // Mostrar as 5 transações mais recentes
          const sorted = [...allTransactions].sort((a, b) =>
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          );
          console.log(`[Pluggy] 📊 Most recent 5 transactions:`);
          for (let i = 0; i < Math.min(5, sorted.length); i++) {
            const t = sorted[i];
            console.log(`[Pluggy]   ${i + 1}. ${t.date?.split('T')[0]} | ${t.description?.substring(0, 40)} | R$ ${t.amount}`);
          }
        }

        return allTransactions
          .map((transaction: any) => this.mapTransaction(transaction))
          .sort((a: OpenBankingTransaction, b: OpenBankingTransaction) =>
            new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
          );
      } catch (error: any) {
        lastError = error;
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

        console.error(`[Pluggy] ❌ Error fetching transactions (attempt ${attempt}/2)`);
        console.error(`[Pluggy] ❌ Status: ${statusCode}, Message: ${errorMessage}`);

        // Se for erro 401 ou 403 (API Key inválida), invalidar cache e tentar com nova key
        if ((statusCode === 401 || statusCode === 403) && !hasTriedFreshKey) {
          console.log(`[Pluggy] 🔄 API Key invalid (${statusCode}), refreshing and retrying...`);
          this.invalidateApiKey();
          hasTriedFreshKey = true;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Para outros erros ou se já tentou com fresh key, não tentar novamente
        break;
      }
    }

    // Todas as tentativas falharam
    const errorMessage = lastError?.response?.data?.message || lastError?.message || 'Unknown error';
    console.error(`[Pluggy] ❌ All attempts to fetch transactions failed: ${errorMessage}`);
    throw new Error(`Failed to fetch transactions: ${errorMessage}`);
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
   * Busca faturas de cartão de crédito (incluindo fatura aberta)
   * Endpoint: GET /bills
   * Retorna transações da fatura aberta (dezembro) que podem não aparecer no /transactions
   */
  async getCreditCardBills(accountId: string): Promise<any[]> {
    try {
      const apiKey = await this.getApiKey();

      console.log(`[Pluggy] 📋 Fetching credit card bills for account ${accountId}`);

      const response = await this.client.get('/bills', {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: {
          accountId,
        },
      });

      const bills = response.data.results || [];
      console.log(`[Pluggy] ✅ Found ${bills.length} credit card bills`);

      // Log info das faturas
      for (const bill of bills) {
        console.log(`[Pluggy] 📋 Bill: ${bill.id} | Due: ${bill.dueDate} | Status: ${bill.state || 'unknown'} | Total: R$ ${bill.totalAmount || 0}`);
      }

      return bills;
    } catch (error: any) {
      console.error(`[Pluggy] ❌ Error fetching credit card bills:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Busca transações de uma fatura específica de cartão de crédito
   * Endpoint: GET /bills/{billId}/transactions ou transações com billId filter
   */
  async getCreditCardBillTransactions(accountId: string, billId: string): Promise<OpenBankingTransaction[]> {
    try {
      const apiKey = await this.getApiKey();

      console.log(`[Pluggy] 📋 Fetching transactions for bill ${billId}`);

      // Tentar buscar transações do bill diretamente
      // Pluggy pode ter transações com billId no endpoint /transactions
      const response = await this.client.get('/transactions', {
        headers: {
          'X-API-KEY': apiKey,
        },
        params: {
          accountId,
          billId, // Filtrar por fatura específica
          pageSize: 500,
        },
      });

      const transactions = response.data.results || [];
      console.log(`[Pluggy] ✅ Found ${transactions.length} transactions for bill ${billId}`);

      return transactions.map((t: any) => this.mapTransaction(t));
    } catch (error: any) {
      console.error(`[Pluggy] ❌ Error fetching bill transactions:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Busca todas as transações de cartão de crédito (incluindo fatura aberta)
   * Combina transações do endpoint /transactions com transações de faturas abertas
   */
  async getAllCreditCardTransactions(
    itemId: string,
    accountId: string,
    days: number = 90
  ): Promise<OpenBankingTransaction[]> {
    console.log(`[Pluggy] 💳 Fetching ALL credit card transactions (including open bill)`);

    // 1. Buscar transações normais
    const regularTransactions = await this.getTransactions(itemId, accountId, days);
    console.log(`[Pluggy] 📊 Regular transactions: ${regularTransactions.length}`);

    // 2. Buscar faturas do cartão
    const bills = await this.getCreditCardBills(accountId);

    // 3. Identificar fatura aberta (estado OPEN ou sem data de pagamento)
    const openBill = bills.find(b =>
      b.state === 'OPEN' ||
      b.state === 'FUTURE' ||
      !b.paymentDate
    );

    if (openBill) {
      console.log(`[Pluggy] 📋 Found open/future bill: ${openBill.id} (due: ${openBill.dueDate})`);

      // Buscar transações da fatura aberta
      const openBillTransactions = await this.getCreditCardBillTransactions(accountId, openBill.id);

      if (openBillTransactions.length > 0) {
        console.log(`[Pluggy] 💳 Open bill transactions: ${openBillTransactions.length}`);

        // Combinar sem duplicatas (usando transaction_id)
        const existingIds = new Set(regularTransactions.map(t => t.transaction_id));
        const newTransactions = openBillTransactions.filter(t => !existingIds.has(t.transaction_id));

        if (newTransactions.length > 0) {
          console.log(`[Pluggy] ✨ Adding ${newTransactions.length} new transactions from open bill`);
          regularTransactions.push(...newTransactions);
        }
      }
    } else {
      console.log(`[Pluggy] ℹ️ No open/future bill found`);
    }

    // Ordenar por data (mais recentes primeiro)
    regularTransactions.sort((a, b) =>
      new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
    );

    return regularTransactions;
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
