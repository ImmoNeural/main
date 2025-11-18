import axios, { AxiosInstance } from 'axios';
import {
  OpenBankingAuthRequest,
  OpenBankingAuthResponse,
  OpenBankingTokenResponse,
  OpenBankingAccount,
  OpenBankingTransaction
} from '../../types';

/**
 * Serviço de integração com Belvo (América Latina)
 *
 * Belvo é um provedor líder de Open Finance para América Latina.
 * Funciona com bancos do Brasil, México, Colômbia e outros países da região.
 *
 * Como obter credenciais:
 * 1. Crie uma conta em: https://dashboard.belvo.com/signup
 * 2. Crie uma aplicação no Dashboard
 * 3. Obtenha seu Secret ID e Secret Password
 * 4. Configure no arquivo .env
 *
 * Documentação: https://developers.belvo.com/docs
 */
export class BelvoService {
  private client: AxiosInstance;
  private secretId: string;
  private secretPassword: string;

  constructor() {
    this.secretId = process.env.BELVO_SECRET_ID || '';
    this.secretPassword = process.env.BELVO_SECRET_PASSWORD || '';

    const baseURL = process.env.BELVO_BASE_URL || 'https://api.belvo.com';

    // Belvo usa Basic Auth (Secret ID:Secret Password em base64)
    const authString = Buffer.from(`${this.secretId}:${this.secretPassword}`).toString('base64');

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      timeout: 30000,
    });

    console.log('[Belvo] Service initialized');
    console.log('   Secret ID:', this.secretId.substring(0, 8) + '...');
    console.log('   Base URL:', baseURL);
  }

  /**
   * Lista instituições (bancos) disponíveis
   */
  async getInstitutions(country: string = 'BR'): Promise<any[]> {
    try {
      console.log(`[Belvo] Fetching institutions for country: ${country}`);

      const response = await this.client.get('/api/institutions/', {
        params: {
          country_code: country,
          page_size: 100,
        },
      });

      const institutions = response.data.results || [];
      console.log(`[Belvo] Found ${institutions.length} institutions`);

      // Log primeiro banco para debug
      if (institutions.length > 0) {
        console.log(`[Belvo] Example institution:`, {
          name: institutions[0].name,
          display_name: institutions[0].display_name,
          country_code: institutions[0].country_code,
          type: institutions[0].type,
        });
      }

      return institutions;
    } catch (error: any) {
      console.error('[Belvo] ❌ Error fetching institutions:', error.response?.data || error.message);
      throw new Error('Failed to fetch Belvo institutions: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Inicia o processo de autenticação com o banco
   * Belvo usa Widget para autenticação no frontend
   */
  async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
    try {
      console.log('[Belvo] Initiating auth for bank:', request.bank_id);

      // Belvo usa um Widget no frontend, então vamos retornar uma URL especial
      // que o frontend vai usar para abrir o Belvo Widget
      const { v4: uuidv4 } = await import('uuid');
      const state = uuidv4();

      // Para Belvo, vamos retornar informações para o Widget
      return {
        authorization_url: `/app/connect-bank/belvo?institution=${request.bank_id}&state=${state}`,
        state,
        consent_id: state, // Usamos o mesmo ID
        provider: 'belvo',
        institution: request.bank_id,
      };
    } catch (error: any) {
      console.error('[Belvo] ❌ Error initiating auth:', error.response?.data || error.message);
      throw new Error('Failed to initiate Belvo auth: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Cria um Link (conexão com banco) no Belvo
   * Esta função é chamada após o usuário completar a autenticação no Widget
   */
  async createLink(institution: string, username: string, password: string, externalId?: string): Promise<any> {
    try {
      console.log('[Belvo] Creating link for institution:', institution);

      const response = await this.client.post('/api/links/', {
        institution,
        username,
        password,
        external_id: externalId || undefined,
        access_mode: 'single', // ou 'recurrent' para acesso contínuo
      });

      const link = response.data;
      console.log('[Belvo] ✅ Link created successfully:', link.id);

      return link;
    } catch (error: any) {
      console.error('[Belvo] ❌ Error creating link:', error.response?.data || error.message);
      throw new Error('Failed to create Belvo link: ' + (error.response?.data?.detail || error.message));
    }
  }

  /**
   * Troca o código de autorização por tokens de acesso
   * Para Belvo, o "code" será o link_id criado após autenticação
   */
  async exchangeCodeForToken(linkId: string, state?: string): Promise<OpenBankingTokenResponse> {
    try {
      console.log('[Belvo] Exchanging link ID for token:', linkId);

      // Para Belvo, o access_token é o próprio link_id
      // e refresh_token pode ser gerado se usar access_mode: 'recurrent'
      return {
        access_token: linkId,
        refresh_token: linkId, // Em Belvo, usamos o mesmo link_id
        expires_in: 7776000, // 90 dias
        token_type: 'Bearer',
      };
    } catch (error: any) {
      console.error('[Belvo] ❌ Error exchanging code:', error.response?.data || error.message);
      throw new Error('Failed to exchange Belvo code: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Busca as contas bancárias do usuário
   * accessToken = link_id
   */
  async getAccounts(linkId: string): Promise<OpenBankingAccount[]> {
    try {
      console.log('[Belvo] Fetching accounts for link:', linkId);

      const response = await this.client.get('/api/accounts/', {
        params: {
          link: linkId,
        },
      });

      const accounts = response.data.results || [];
      console.log(`[Belvo] Found ${accounts.length} accounts`);

      return accounts.map((account: any) => this.mapBelvoAccount(account));
    } catch (error: any) {
      console.error('[Belvo] ❌ Error fetching accounts:', error.response?.data || error.message);
      throw new Error('Failed to fetch Belvo accounts: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Mapeia conta do Belvo para nosso formato
   */
  private mapBelvoAccount(account: any): OpenBankingAccount {
    return {
      id: account.id,
      iban: account.number || account.id,
      currency: account.currency || 'BRL',
      name: account.name || account.type || 'Conta',
      account_type: this.mapAccountType(account.type),
      balance: {
        amount: parseFloat(account.balance?.available || account.balance?.current || 0),
        currency: account.currency || 'BRL',
      },
    };
  }

  /**
   * Mapeia tipo de conta do Belvo
   */
  private mapAccountType(type: string): string {
    const typeMap: Record<string, string> = {
      'checking': 'checking',
      'savings': 'savings',
      'credit': 'credit',
      'pension': 'pension',
      'loan': 'loan',
      'investment': 'investment',
    };

    return typeMap[type?.toLowerCase()] || 'checking';
  }

  /**
   * Busca as transações de uma conta
   * accessToken = link_id
   */
  async getTransactions(
    linkId: string,
    accountId: string,
    days: number = 90
  ): Promise<OpenBankingTransaction[]> {
    try {
      console.log(`[Belvo] Fetching transactions for account ${accountId} (${days} days)`);

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      const response = await this.client.get('/api/transactions/', {
        params: {
          link: linkId,
          account: accountId,
          date_from: dateFromStr,
          page_size: 1000,
        },
      });

      const transactions = response.data.results || [];
      console.log(`[Belvo] Found ${transactions.length} transactions`);

      return transactions.map((tx: any) => this.mapBelvoTransaction(tx));
    } catch (error: any) {
      console.error('[Belvo] ❌ Error fetching transactions:', error.response?.data || error.message);
      throw new Error('Failed to fetch Belvo transactions: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Mapeia transação do Belvo para nosso formato
   */
  private mapBelvoTransaction(tx: any): OpenBankingTransaction {
    const amount = parseFloat(tx.amount || 0);

    return {
      transaction_id: tx.id,
      booking_date: tx.value_date || tx.accounting_date,
      value_date: tx.value_date || tx.accounting_date,
      transaction_amount: {
        amount: Math.abs(amount),
        currency: tx.currency || 'BRL',
      },
      creditor_name: amount > 0 ? (tx.description || tx.merchant?.name || 'Crédito') : undefined,
      debtor_name: amount < 0 ? (tx.description || tx.merchant?.name || 'Débito') : undefined,
      remittance_information: tx.description || tx.merchant?.name || tx.reference || '',
      balance_after_transaction: tx.balance ? {
        amount: parseFloat(tx.balance),
        currency: tx.currency || 'BRL',
      } : undefined,
      status: tx.status === 'PROCESSED' ? 'BOOK' : 'PENDING',
    };
  }

  /**
   * Revoga o acesso (deleta o link)
   */
  async revokeConsent(linkId: string): Promise<void> {
    try {
      console.log('[Belvo] Revoking consent for link:', linkId);

      await this.client.delete(`/api/links/${linkId}/`);

      console.log('[Belvo] ✅ Consent revoked successfully');
    } catch (error: any) {
      console.error('[Belvo] ❌ Error revoking consent:', error.response?.data || error.message);
      throw new Error('Failed to revoke Belvo consent: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * Renova o token de acesso (refresh token)
   * Para Belvo com access_mode 'recurrent', o link permanece ativo
   */
  async refreshAccessToken(linkId: string): Promise<OpenBankingTokenResponse> {
    try {
      console.log('[Belvo] Refreshing access token for link:', linkId);

      // Verifica se o link ainda está ativo
      const response = await this.client.get(`/api/links/${linkId}/`);
      const link = response.data;

      if (link.status !== 'valid') {
        throw new Error('Link is no longer valid');
      }

      // Retorna o mesmo linkId como token
      return {
        access_token: linkId,
        refresh_token: linkId,
        expires_in: 7776000, // 90 dias
        token_type: 'Bearer',
      };
    } catch (error: any) {
      console.error('[Belvo] ❌ Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh Belvo token: ' + (error.response?.data?.message || error.message));
    }
  }
}
