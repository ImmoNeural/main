// GARANTIR que .env é carregado ANTES!
import '../config/env';

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
 * - Belvo (Open Finance para América Latina) 🌎
 * - Mock (para desenvolvimento/testes)
 *
 * Configure o provedor via variável de ambiente OPEN_BANKING_PROVIDER
 */
class OpenBankingService {
  private providerType: ProviderType;

  constructor() {
    // LER SEMPRE DO AMBIENTE (não cachear no constructor)
    console.log('🔧 [OpenBankingService] Constructor called');
    console.log('   process.env.OPEN_BANKING_PROVIDER:', process.env.OPEN_BANKING_PROVIDER);

    this.providerType = (process.env.OPEN_BANKING_PROVIDER || 'mock') as ProviderType;

    console.log('   Using provider:', this.providerType);
    console.log('');
  }

  /**
   * Obtém instância do provedor configurado
   * LÊ DIRETAMENTE DO AMBIENTE sempre que chamado
   */
  private getProvider() {
    // SEMPRE pegar o valor mais recente do ambiente
    const currentProvider = (process.env.OPEN_BANKING_PROVIDER || 'mock') as ProviderType;

    // Se mudou, atualizar
    if (currentProvider !== this.providerType) {
      console.log(`🔄 [OpenBankingService] Provider changed from ${this.providerType} to ${currentProvider}`);
      this.providerType = currentProvider;
    }

    return ProviderFactory.getProvider(this.providerType);
  }

  /**
   * Lista de bancos disponíveis
   * Retorna lista de instituições baseada no provedor configurado
   */
  async getAvailableBanks(country: string = 'DE') {
    console.log('\n📋 [OpenBanking] getAvailableBanks START');
    console.log('   Country:', country);
    console.log('   Provider type:', this.providerType);

    try {
      const provider = this.getProvider();
      console.log(`   Provider instance:`, provider.constructor.name);

      // Pluggy (Brasil)
      if ('getConnectors' in provider) {
        console.log('   ✅ Provider has getConnectors (Pluggy detected)');
        console.log('   🔄 Calling provider.getConnectors...');

        try {
          const connectors = await (provider as any).getConnectors(country);
          console.log(`   📊 Received ${connectors.length} connectors from Pluggy API`);

          if (connectors.length > 0) {
            console.log('   ✅ Mapping connectors to banks...');
            const banks = this.mapConnectorsToBanks(connectors);
            console.log(`   ✅ Returning ${banks.length} banks from Pluggy`);
            return banks;
          }

          console.log('');
          console.log('   ⚠️⚠️⚠️ WARNING ⚠️⚠️⚠️');
          console.log('   Pluggy returned 0 connectors!');
          console.log('   This usually means:');
          console.log('   1. PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET are missing');
          console.log('   2. Credentials are invalid');
          console.log('   3. Pluggy API is down');
          console.log('');
          console.log('   📋 Falling back to static bank list');
          console.log('');
        } catch (pluggyError: any) {
          console.error('');
          console.error('   ❌❌❌ PLUGGY ERROR ❌❌❌');
          console.error('   Error calling Pluggy getConnectors:');
          console.error('   Message:', pluggyError.message);
          console.error('   Stack:', pluggyError.stack);
          if (pluggyError.response) {
            console.error('   HTTP Status:', pluggyError.response.status);
            console.error('   Response:', JSON.stringify(pluggyError.response.data, null, 2));
          }
          console.error('');
          console.error('   📋 Falling back to static bank list due to Pluggy error');
          console.error('');
        }
      } else {
        console.log('   ℹ️ Provider does NOT have getConnectors');
      }

      // Belvo (América Latina) ou Nordigen (Europa)
      if ('getInstitutions' in provider) {
        // Verificar se é Belvo ou Nordigen pelo nome do construtor
        const providerName = provider.constructor.name;
        console.log(`   Provider with getInstitutions: ${providerName}`);

        const institutions = await (provider as any).getInstitutions(country);

        // Mapear de forma específica dependendo do provedor
        if (providerName === 'BelvoService') {
          console.log(`   Using Belvo institutions (${institutions.length} found)`);
          return this.mapBelvoInstitutionsToBanks(institutions);
        } else {
          console.log(`   Using Nordigen institutions (${institutions.length} found)`);
          return this.mapInstitutionsToBanks(institutions);
        }
      }

      // Tink (Europa)
      if ('getProviders' in provider) {
        console.log('   Using Tink providers');
        const providers = await (provider as any).getProviders(country);
        return this.mapProvidersToBanks(providers);
      }

      // Fallback para lista estática
      console.log('   📋 Using static bank list (no provider matched or empty response)');
      const staticBanks = this.getStaticBankList(country);
      console.log(`   📊 Static list has ${staticBanks.length} banks`);
      return staticBanks;
    } catch (error) {
      console.error('   ❌ CATCH: Error in getAvailableBanks:', error);
      console.error('      Stack:', error);
      // Em caso de erro, retorna lista estática
      console.log('   📋 Falling back to static list due to CATCH error');
      const staticBanks = this.getStaticBankList(country);
      console.log(`   📊 Static list has ${staticBanks.length} banks`);
      return staticBanks;
    } finally {
      console.log('📋 [OpenBanking] getAvailableBanks END\n');
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
   * Mapeia instituições do Belvo para nosso formato
   */
  private mapBelvoInstitutionsToBanks(institutions: any[]) {
    return institutions.map(inst => ({
      id: inst.name, // Belvo usa 'name' como ID
      name: inst.display_name || inst.name,
      logo: inst.icon || inst.logo || '🏦',
      country: inst.country_code || 'BR',
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
