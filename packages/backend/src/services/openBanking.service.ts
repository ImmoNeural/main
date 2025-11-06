import {
  OpenBankingAuthRequest,
  OpenBankingAuthResponse,
  OpenBankingTokenResponse,
  OpenBankingAccount,
  OpenBankingTransaction
} from '../types';
import { ProviderFactory, ProviderType } from './providers/provider.factory';

/**
 * Serviço de integração com APIs Open Banking (PSD2)
 *
 * Suporta múltiplos provedores:
 * - GoCardless/Nordigen (gratuito, excelente para Europa)
 * - Tink (popular na Europa)
 * - Pluggy (gratuito, recomendado para Brasil) 🇧🇷
 * - Mock (para desenvolvimento/testes)
 *
 * Configure o provedor via variável de ambiente OPEN_BANKING_PROVIDER
 */
class OpenBankingService {
  private providerType: ProviderType;

  constructor() {
    this.providerType = (process.env.OPEN_BANKING_PROVIDER || 'mock') as ProviderType;
  }

  /**
   * Obtém instância do provedor configurado
   */
  private getProvider() {
    return ProviderFactory.getProvider(this.providerType);
  }

  /**
   * Lista de bancos disponíveis
   * Retorna lista de instituições baseada no provedor configurado
   */
  async getAvailableBanks(country: string = 'DE') {
    try {
      const provider = this.getProvider();
      console.log(`[OpenBanking] Getting banks for country: ${country}, provider: ${this.providerType}`);

      // Pluggy (Brasil)
      if ('getConnectors' in provider) {
        console.log('[OpenBanking] Using Pluggy connectors...');
        const connectors = await (provider as any).getConnectors(country);
        console.log(`[OpenBanking] Found ${connectors.length} connectors from Pluggy`);

        if (connectors.length > 0) {
          return this.mapConnectorsToBanks(connectors);
        }

        console.log('[OpenBanking] No connectors from API, using static list');
      }

      // Nordigen (Europa)
      if ('getInstitutions' in provider) {
        const institutions = await (provider as any).getInstitutions(country);
        return this.mapInstitutionsToBanks(institutions);
      }

      // Tink (Europa)
      if ('getProviders' in provider) {
        const providers = await (provider as any).getProviders(country);
        return this.mapProvidersToBanks(providers);
      }

      // Fallback para lista estática
      console.log('[OpenBanking] Using static bank list');
      return this.getStaticBankList(country);
    } catch (error) {
      console.error('[OpenBanking] Error fetching available banks:', error);
      // Em caso de erro, retorna lista estática
      console.log('[OpenBanking] Falling back to static list due to error');
      return this.getStaticBankList(country);
    }
  }

  /**
   * Lista estática de bancos principais por país
   */
  private getStaticBankList(country: string) {
    const banks = {
      DE: [
        { id: 'DEUTSCHE_BANK_DEFF', name: 'Deutsche Bank', logo: '🏦', country: 'DE' },
        { id: 'COMMERZBANK_COBADEFF', name: 'Commerzbank', logo: '🏦', country: 'DE' },
        { id: 'SPARKASSE_DE', name: 'Sparkasse', logo: '🏦', country: 'DE' },
        { id: 'ING_INGDDEFF', name: 'ING', logo: '🏦', country: 'DE' },
        { id: 'N26_NTSBDEB1', name: 'N26', logo: '🏦', country: 'DE' },
        { id: 'DKB_BYLADEM1', name: 'DKB', logo: '🏦', country: 'DE' },
        { id: 'POSTBANK_PBNKDEFF', name: 'Postbank', logo: '🏦', country: 'DE' },
      ],
      BR: [
        { id: '201', name: 'Santander', logo: '🏦', country: 'BR' },
        { id: '341', name: 'Itaú', logo: '🏦', country: 'BR' },
        { id: '237', name: 'Bradesco', logo: '🏦', country: 'BR' },
        { id: '001', name: 'Banco do Brasil', logo: '🏦', country: 'BR' },
        { id: '104', name: 'Caixa Econômica', logo: '🏦', country: 'BR' },
        { id: '260', name: 'Nubank', logo: '💜', country: 'BR' },
        { id: '077', name: 'Inter', logo: '🧡', country: 'BR' },
        { id: '336', name: 'C6 Bank', logo: '🏦', country: 'BR' },
        { id: '290', name: 'PagBank', logo: '🏦', country: 'BR' },
        { id: '212', name: 'Original', logo: '🏦', country: 'BR' },
      ],
      GB: [
        { id: 'REVOLUT_REVOLT21', name: 'Revolut', logo: '🏦', country: 'GB' },
      ],
    };

    return banks[country as keyof typeof banks] || banks.DE;
  }

  /**
   * Mapeia conectores do Pluggy para nosso formato
   */
  private mapConnectorsToBanks(connectors: any[]) {
    return connectors.map(connector => ({
      id: connector.id.toString(),
      name: connector.name,
      logo: connector.imageUrl || '🏦',
      country: connector.country || 'BR',
    }));
  }

  /**
   * Mapeia instituições do Nordigen para nosso formato
   */
  private mapInstitutionsToBanks(institutions: any[]) {
    return institutions.map(inst => ({
      id: inst.id,
      name: inst.name,
      logo: inst.logo || '🏦',
      country: inst.countries?.[0] || inst.country || 'DE',
    }));
  }

  /**
   * Mapeia provedores do Tink para nosso formato
   */
  private mapProvidersToBanks(providers: any[]) {
    return providers.map(provider => ({
      id: provider.name,
      name: provider.displayName || provider.name,
      logo: '🏦',
      country: provider.market || 'DE',
    }));
  }

  /**
   * Inicia o processo de autenticação com o banco
   */
  async initiateAuth(request: OpenBankingAuthRequest): Promise<OpenBankingAuthResponse> {
    try {
      const provider = this.getProvider();
      return await provider.initiateAuth(request);
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
      const provider = this.getProvider();
      return await provider.exchangeCodeForToken(code, state);
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
      const provider = this.getProvider();

      if (provider.refreshAccessToken) {
        return await provider.refreshAccessToken(refreshToken);
      }

      throw new Error('Provider does not support token refresh');
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
      const provider = this.getProvider();
      return await provider.getAccounts(accessToken);
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
      const provider = this.getProvider();
      return await provider.getTransactions(accessToken, accountId, days);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Revoga o acesso (desconecta a conta)
   */
  async revokeConsent(accessToken: string): Promise<void> {
    try {
      const provider = this.getProvider();
      await provider.revokeConsent(accessToken);
    } catch (error) {
      console.error('Error revoking consent:', error);
      throw new Error('Failed to revoke bank consent');
    }
  }
}

export default new OpenBankingService();
