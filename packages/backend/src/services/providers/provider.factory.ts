import { NordigenService } from './nordigen.service';
import { TinkService } from './tink.service';
import { PluggyService } from './pluggy.service';
import { BelvoService } from './belvo.service';
import {
  OpenBankingAuthRequest,
  OpenBankingAuthResponse,
  OpenBankingTokenResponse,
  OpenBankingAccount,
  OpenBankingTransaction
} from '../../types';

/**
 * Interface comum para todos os provedores Open Banking
 */
export interface OpenBankingProvider {
  initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse>;
  exchangeCodeForToken(code: string, state?: string): Promise<OpenBankingTokenResponse>;
  getAccounts(accessToken: string): Promise<OpenBankingAccount[]>;
  getTransactions(
    accessToken: string,
    accountId: string,
    days?: number
  ): Promise<OpenBankingTransaction[]>;
  revokeConsent(accessToken: string): Promise<void>;
  refreshAccessToken?(refreshToken: string): Promise<OpenBankingTokenResponse>;
}

/**
 * Tipos de provedores disponíveis
 */
export type ProviderType = 'nordigen' | 'tink' | 'pluggy' | 'belvo' | 'mock';

/**
 * Factory para criar instâncias de provedores Open Banking
 */
export class ProviderFactory {
  private static providers: Map<ProviderType, OpenBankingProvider> = new Map();

  /**
   * Obtém uma instância do provedor especificado
   */
  static getProvider(type: ProviderType): OpenBankingProvider {
    // Se já temos a instância em cache, retorna
    if (this.providers.has(type)) {
      return this.providers.get(type)!;
    }

    // Cria nova instância baseado no tipo
    let provider: OpenBankingProvider;

    switch (type) {
      case 'nordigen':
        provider = new NordigenService();
        break;

      case 'tink':
        provider = new TinkService();
        break;

      case 'pluggy':
        provider = new PluggyService();
        break;

      case 'belvo':
        provider = new BelvoService();
        break;

      case 'mock':
        provider = this.createMockProvider();
        break;

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    // Cacheia a instância
    this.providers.set(type, provider);
    return provider;
  }

  /**
   * Obtém o provedor padrão baseado na configuração
   */
  static getDefaultProvider(): OpenBankingProvider {
    const providerType = (process.env.OPEN_BANKING_PROVIDER || 'mock') as ProviderType;
    return this.getProvider(providerType);
  }

  /**
   * Cria um provedor mock para desenvolvimento/testes
   */
  private static createMockProvider(): OpenBankingProvider {
    const { v4: uuidv4 } = require('uuid');

    return {
      async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
        const state = uuidv4();
        const consentId = uuidv4();

        const authorizationUrl =
          `http://localhost:3001/mock-bank-auth?` +
          `bank_id=${request.bank_id}&` +
          `redirect_uri=${encodeURIComponent(request.redirect_uri)}&` +
          `state=${state}&` +
          `consent_id=${consentId}`;

        return {
          authorization_url: authorizationUrl,
          state,
          consent_id: consentId,
        };
      },

      async exchangeCodeForToken(_code: string): Promise<OpenBankingTokenResponse> {
        return {
          access_token: `mock_access_token_${uuidv4()}`,
          refresh_token: `mock_refresh_token_${uuidv4()}`,
          expires_in: 7776000, // 90 days
          token_type: 'Bearer',
        };
      },

      async getAccounts(_accessToken: string): Promise<OpenBankingAccount[]> {
        return [
          {
            id: uuidv4(),
            iban: 'DE89370400440532013000',
            currency: 'EUR',
            name: 'Conta Corrente (Mock)',
            account_type: 'checking',
            balance: {
              amount: 5430.50,
              currency: 'EUR',
            },
          },
          {
            id: uuidv4(),
            iban: 'DE89370400440532013001',
            currency: 'EUR',
            name: 'Conta Poupança (Mock)',
            account_type: 'savings',
            balance: {
              amount: 12500.00,
              currency: 'EUR',
            },
          },
        ];
      },

      async getTransactions(
        _accessToken: string,
        _accountId: string,
        days: number = 90
      ): Promise<OpenBankingTransaction[]> {
        const transactions: OpenBankingTransaction[] = [];
        const merchants = [
          { name: 'REWE Supermarkt', amount: -45.32 },
          { name: 'Amazon.de', amount: -89.99 },
          { name: 'Netflix', amount: -12.99 },
          { name: 'Spotify', amount: -9.99 },
          { name: 'Shell Tankstelle', amount: -65.00 },
          { name: 'MediaMarkt', amount: -234.50 },
          { name: 'Gehalt', amount: 3500.00 },
          { name: 'EDEKA', amount: -56.78 },
          { name: 'Vodafone', amount: -39.99 },
          { name: 'Stadtwerke Strom', amount: -120.00 },
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
      },

      async revokeConsent(_accessToken: string): Promise<void> {
        console.log('Mock: Consent revoked');
      },

      async refreshAccessToken(_refreshToken: string): Promise<OpenBankingTokenResponse> {
        return {
          access_token: `mock_access_token_${uuidv4()}`,
          refresh_token: `mock_refresh_token_${uuidv4()}`,
          expires_in: 7776000,
          token_type: 'Bearer',
        };
      },
    };
  }

  /**
   * Limpa o cache de provedores (útil para testes)
   */
  static clearCache(): void {
    this.providers.clear();
  }
}

/**
 * Exporta o provedor padrão para uso fácil
 */
export const defaultProvider = ProviderFactory.getDefaultProvider();
