import axios, { AxiosInstance } from 'axios';
import {
  OpenBankingAuthRequest,
  OpenBankingAuthResponse,
  OpenBankingTokenResponse,
  OpenBankingAccount,
  OpenBankingTransaction
} from '../../types';

/**
 * Serviço de integração com GoCardless/Nordigen
 *
 * GoCardless (anteriormente Nordigen) é gratuito para uso pessoal e
 * oferece excelente cobertura de bancos europeus, incluindo Deutsche Bank.
 *
 * Como obter credenciais:
 * 1. Crie uma conta em: https://bankaccountdata.gocardless.com/
 * 2. Acesse o Portal de Desenvolvimento
 * 3. Obtenha seu Secret ID e Secret Key
 *
 * Documentação: https://developer.gocardless.com/bank-account-data/overview
 */
export class NordigenService {
  private client: AxiosInstance;
  private secretId: string;
  private secretKey: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.secretId = process.env.NORDIGEN_SECRET_ID || '';
    this.secretKey = process.env.NORDIGEN_SECRET_KEY || '';

    this.client = axios.create({
      baseURL: 'https://bankaccountdata.gocardless.com/api/v2',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Obtém ou renova o token de acesso da API
   */
  private async getAccessToken(): Promise<string> {
    // Se já temos um token válido, retorna ele
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await this.client.post('/token/new/', {
        secret_id: this.secretId,
        secret_key: this.secretKey,
      });

      this.accessToken = response.data.access as string;
      // Token expira em 24 horas, mas vamos renovar 5min antes
      this.tokenExpiresAt = Date.now() + (response.data.access_expires - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Error obtaining Nordigen access token:', error);
      throw new Error('Failed to authenticate with Nordigen');
    }
  }

  /**
   * Lista instituições disponíveis por país
   */
  async getInstitutions(country: string = 'DE'): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get(`/institutions/?country=${country}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching institutions:', error);
      throw new Error('Failed to fetch available institutions');
    }
  }

  /**
   * Inicia o processo de autenticação
   */
  async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
    try {
      const token = await this.getAccessToken();

      // Criar uma requisição (requisition) para o banco
      const requisitionResponse = await this.client.post(
        '/requisitions/',
        {
          redirect: request.redirect_uri,
          institution_id: request.bank_id,
          reference: request.user_id,
          user_language: 'DE', // ou 'EN' dependendo da preferência
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const requisition = requisitionResponse.data;

      return {
        authorization_url: requisition.link,
        state: requisition.id,
        consent_id: requisition.id,
      };
    } catch (error: any) {
      console.error('Error initiating Nordigen auth:', error.response?.data || error);
      throw new Error('Failed to initiate bank authorization');
    }
  }

  /**
   * Obtém informações da requisição após o callback
   */
  async getRequisition(requisitionId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get(`/requisitions/${requisitionId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching requisition:', error);
      throw new Error('Failed to fetch requisition data');
    }
  }

  /**
   * No Nordigen, não há troca de código por token como OAuth tradicional.
   * O fluxo é: usuário autoriza -> obtém accounts IDs -> usa diretamente
   */
  async exchangeCodeForToken(requisitionId: string): Promise<OpenBankingTokenResponse> {
    try {
      // Verificar se a requisition existe
      await this.getRequisition(requisitionId);

      // Nordigen não usa refresh tokens da mesma forma
      // O access é gerenciado pela própria API
      return {
        access_token: requisitionId, // Usamos o requisition ID como "token"
        refresh_token: requisitionId,
        expires_in: 7776000, // 90 dias (duração do consent)
        token_type: 'Bearer',
      };
    } catch (error) {
      console.error('Error processing requisition:', error);
      throw new Error('Failed to process authorization');
    }
  }

  /**
   * Busca contas vinculadas à requisição
   */
  async getAccounts(requisitionId: string): Promise<OpenBankingAccount[]> {
    try {
      const token = await this.getAccessToken();
      const requisition = await this.getRequisition(requisitionId);

      if (!requisition.accounts || requisition.accounts.length === 0) {
        throw new Error('No accounts found in requisition');
      }

      const accounts: OpenBankingAccount[] = [];

      // Buscar detalhes de cada conta
      for (const accountId of requisition.accounts) {
        try {
          // Buscar detalhes da conta
          const detailsResponse = await this.client.get(
            `/accounts/${accountId}/details/`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          // Buscar saldo da conta
          const balancesResponse = await this.client.get(
            `/accounts/${accountId}/balances/`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const details = detailsResponse.data.account;
          const balances = balancesResponse.data.balances || [];

          // Pegar o saldo mais recente (interim ou expected)
          const balance = balances.find((b: any) =>
            b.balanceType === 'interimAvailable' || b.balanceType === 'expected'
          ) || balances[0];

          accounts.push({
            id: accountId,
            iban: details.iban,
            currency: details.currency || balance?.balanceAmount?.currency || 'EUR',
            name: details.name || details.product || 'Conta Bancária',
            account_type: this.mapAccountType(details.cashAccountType),
            balance: {
              amount: balance?.balanceAmount?.amount ? parseFloat(balance.balanceAmount.amount) : 0,
              currency: balance?.balanceAmount?.currency || 'EUR',
            },
          });
        } catch (accountError) {
          console.error(`Error fetching account ${accountId}:`, accountError);
          // Continuar com as outras contas
        }
      }

      return accounts;
    } catch (error) {
      console.error('Error fetching Nordigen accounts:', error);
      throw new Error('Failed to fetch bank accounts');
    }
  }

  /**
   * Busca transações de uma conta
   */
  async getTransactions(
    _accessToken: string,
    accountId: string,
    days: number = 90
  ): Promise<OpenBankingTransaction[]> {
    try {
      const token = await this.getAccessToken();

      // Calcular dateFrom e dateTo baseado em days
      const dateTo = new Date().toISOString().split('T')[0];
      const dateFromObj = new Date();
      dateFromObj.setDate(dateFromObj.getDate() - days);
      const dateFrom = dateFromObj.toISOString().split('T')[0];

      const response = await this.client.get(
        `/accounts/${accountId}/transactions/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            date_from: dateFrom,
            date_to: dateTo,
          },
        }
      );

      const transactions = response.data.transactions;
      const allTransactions: OpenBankingTransaction[] = [];

      // Nordigen retorna booked e pending separadamente
      if (transactions.booked) {
        allTransactions.push(...transactions.booked.map((t: any) => this.mapTransaction(t, 'BOOK')));
      }

      if (transactions.pending) {
        allTransactions.push(...transactions.pending.map((t: any) => this.mapTransaction(t, 'PDNG')));
      }

      return allTransactions.sort((a, b) =>
        new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
      );
    } catch (error) {
      console.error('Error fetching Nordigen transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Deleta uma requisição (revoga o consentimento)
   */
  async revokeConsent(requisitionId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      await this.client.delete(`/requisitions/${requisitionId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Error revoking Nordigen consent:', error);
      throw new Error('Failed to revoke consent');
    }
  }

  /**
   * Mapeia tipo de conta do Nordigen para nosso formato
   */
  private mapAccountType(cashAccountType?: string): string {
    const mapping: { [key: string]: string } = {
      'CACC': 'checking', // Current account
      'SVGS': 'savings',  // Savings account
      'CARD': 'card',     // Card account
      'TRAN': 'checking', // Transactional account
    };

    return mapping[cashAccountType || ''] || 'checking';
  }

  /**
   * Mapeia transação do Nordigen para nosso formato
   */
  private mapTransaction(transaction: any, status: string): OpenBankingTransaction {
    const amount = transaction.transactionAmount?.amount
      ? parseFloat(transaction.transactionAmount.amount)
      : 0;

    return {
      transaction_id: transaction.transactionId || transaction.internalTransactionId,
      booking_date: transaction.bookingDate || transaction.valueDate,
      value_date: transaction.valueDate,
      transaction_amount: {
        amount,
        currency: transaction.transactionAmount?.currency || 'EUR',
      },
      creditor_name: transaction.creditorName,
      debtor_name: transaction.debtorName,
      remittance_information:
        transaction.remittanceInformationUnstructured ||
        transaction.remittanceInformationUnstructuredArray?.join(' ') ||
        transaction.additionalInformation ||
        '',
      balance_after_transaction: transaction.balanceAfterTransaction ? {
        amount: parseFloat(transaction.balanceAfterTransaction.balanceAmount?.amount || '0'),
        currency: transaction.balanceAfterTransaction.balanceAmount?.currency || 'EUR',
      } : undefined,
      status,
    };
  }
}

export default new NordigenService();
