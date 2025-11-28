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
   *
   * IMPORTANTE: Este método SEMPRE retorna uma lista de bancos, mesmo se o provedor falhar.
   * Isso garante que o usuário sempre veja os bancos disponíveis.
   * O erro real só será mostrado quando o usuário tentar CONECTAR a um banco.
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

            // Se o filtro Open Finance resultou em 0 bancos, incluir todos os conectores
            if (banks.length === 0) {
              console.log('   ⚠️ No Open Finance banks found, returning all connectors');
              const allBanks = connectors.map((connector: any) => ({
                id: connector.id.toString(),
                name: connector.name,
                logo: connector.imageUrl || '🏦',
                country: connector.country || 'BR',
              }));
              console.log(`   ✅ Returning ${allBanks.length} banks (all connectors)`);
              return allBanks;
            }

            console.log(`   ✅ Returning ${banks.length} banks from Pluggy`);
            return banks;
          }

          // Pluggy retornou 0 conectores - fallback para lista estática
          console.warn('');
          console.warn('   ⚠️ Pluggy returned 0 connectors');
          console.warn('   Falling back to static bank list');
          console.warn('');
        } catch (pluggyError: any) {
          console.error('');
          console.error('   ⚠️ PLUGGY API ERROR');
          console.error('   Error calling Pluggy getConnectors:');
          console.error('   Message:', pluggyError.message);
          if (pluggyError.response) {
            console.error('   HTTP Status:', pluggyError.response.status);
            console.error('   Response:', JSON.stringify(pluggyError.response.data, null, 2));
          }
          console.error('');
          console.log('   📋 Falling back to static bank list');
        }
      } else {
        console.log('   ℹ️ Provider does NOT have getConnectors');
      }

      // Belvo (América Latina) ou Nordigen (Europa)
      if ('getInstitutions' in provider) {
        try {
          const providerName = provider.constructor.name;
          console.log(`   Provider with getInstitutions: ${providerName}`);

          const institutions = await (provider as any).getInstitutions(country);

          if (providerName === 'BelvoService') {
            console.log(`   Using Belvo institutions (${institutions.length} found)`);
            return this.mapBelvoInstitutionsToBanks(institutions);
          } else {
            console.log(`   Using Nordigen institutions (${institutions.length} found)`);
            return this.mapInstitutionsToBanks(institutions);
          }
        } catch (institutionError: any) {
          console.error('   ⚠️ Error fetching institutions:', institutionError.message);
          console.log('   📋 Falling back to static bank list');
        }
      }

      // Tink (Europa)
      if ('getProviders' in provider) {
        try {
          console.log('   Using Tink providers');
          const providers = await (provider as any).getProviders(country);
          return this.mapProvidersToBanks(providers);
        } catch (tinkError: any) {
          console.error('   ⚠️ Error fetching Tink providers:', tinkError.message);
          console.log('   📋 Falling back to static bank list');
        }
      }

      // Fallback para lista estática - SEMPRE retorna bancos para o usuário
      console.log('   📋 Using static bank list as fallback');
      const staticBanks = this.getStaticBankList(country);
      console.log(`   📊 Static list has ${staticBanks.length} banks`);
      return staticBanks;
    } catch (error: any) {
      console.error('   ❌ CATCH: Error in getAvailableBanks:', error);

      // SEMPRE retorna lista estática em caso de erro
      // Assim o usuário vê os bancos e só recebe erro ao tentar conectar
      console.log('   📋 Falling back to static list due to error');
      const staticBanks = this.getStaticBankList(country);
      console.log(`   📊 Static list has ${staticBanks.length} banks`);
      return staticBanks;
    } finally {
      console.log('📋 [OpenBanking] getAvailableBanks END\n');
    }
  }

  /**
   * Lista estática de bancos principais por país
   * Usada como fallback quando a API do provedor não está disponível
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
        // Bancos tradicionais
        { id: '001', name: 'Banco do Brasil', logo: '🏦', country: 'BR' },
        { id: '341', name: 'Itaú Unibanco', logo: '🏦', country: 'BR' },
        { id: '237', name: 'Bradesco', logo: '🏦', country: 'BR' },
        { id: '033', name: 'Santander Brasil', logo: '🏦', country: 'BR' },
        { id: '104', name: 'Caixa Econômica Federal', logo: '🏦', country: 'BR' },
        // Bancos digitais
        { id: '260', name: 'Nubank', logo: '💜', country: 'BR' },
        { id: '077', name: 'Banco Inter', logo: '🧡', country: 'BR' },
        { id: '336', name: 'C6 Bank', logo: '⚫', country: 'BR' },
        { id: '290', name: 'PagBank', logo: '🟢', country: 'BR' },
        { id: '212', name: 'Banco Original', logo: '🟢', country: 'BR' },
        { id: '380', name: 'PicPay', logo: '🟢', country: 'BR' },
        { id: '323', name: 'Mercado Pago', logo: '🔵', country: 'BR' },
        { id: '637', name: 'Sofisa Direto', logo: '🏦', country: 'BR' },
        { id: '756', name: 'Sicoob', logo: '🏦', country: 'BR' },
        { id: '748', name: 'Sicredi', logo: '🏦', country: 'BR' },
        // Outros
        { id: '041', name: 'Banrisul', logo: '🏦', country: 'BR' },
        { id: '422', name: 'Safra', logo: '🏦', country: 'BR' },
        { id: '745', name: 'Citibank', logo: '🏦', country: 'BR' },
        { id: '399', name: 'HSBC', logo: '🏦', country: 'BR' },
        { id: '208', name: 'BTG Pactual', logo: '🏦', country: 'BR' },
      ],
      GB: [
        { id: 'REVOLUT_REVOLT21', name: 'Revolut', logo: '🏦', country: 'GB' },
        { id: 'MONZO_UK', name: 'Monzo', logo: '🏦', country: 'GB' },
        { id: 'STARLING_UK', name: 'Starling Bank', logo: '🏦', country: 'GB' },
      ],
    };

    return banks[country as keyof typeof banks] || banks.BR;
  }

  /**
   * Mapeia conectores do Pluggy para nosso formato
   */
  private mapConnectorsToBanks(connectors: any[]) {
    // Filtrar APENAS conectores Open Finance (regulados pelo Banco Central)
    // Estes são muito mais confiáveis que os conectores de scraping
    const openFinanceConnectors = connectors.filter(connector => connector.isOpenFinance === true);

    console.log(`   📊 Total connectors: ${connectors.length}`);
    console.log(`   ✅ Open Finance connectors: ${openFinanceConnectors.length}`);
    console.log(`   ❌ Filtered out (non-Open Finance): ${connectors.length - openFinanceConnectors.length}`);

    // Remover duplicatas pelo nome base do banco (sem sufixos como PF/PJ)
    // Manter preferência por conectores "regulado" se existirem
    const uniqueBanks = new Map<string, any>();

    for (const connector of openFinanceConnectors) {
      // Extrair nome base removendo "(Open Finance)", "PF", "PJ", etc.
      const baseName = connector.name
        .replace(/\s*\(Open Finance\)\s*/gi, '')
        .replace(/\s*-?\s*PF\s*$/gi, '')
        .replace(/\s*-?\s*PJ\s*$/gi, '')
        .replace(/\s*-?\s*Pessoa\s*(Física|Jurídica)\s*/gi, '')
        .trim();

      const key = `${baseName}_${connector.type || 'BANK'}`;
      const existing = uniqueBanks.get(key);

      // Preferir conector "regulado" se existir ou se não houver existente
      const isRegulated = connector.name.toLowerCase().includes('regulado');
      const existingIsRegulated = existing?.name?.toLowerCase().includes('regulado');

      if (!existing || (isRegulated && !existingIsRegulated)) {
        uniqueBanks.set(key, connector);
      }
    }

    const filteredConnectors = Array.from(uniqueBanks.values());
    console.log(`   🔄 After deduplication: ${filteredConnectors.length} unique banks`);

    return filteredConnectors.map(connector => ({
      id: connector.id.toString(),
      name: connector.name.includes('Open Finance') ? connector.name : `${connector.name} (Open Finance)`,
      logo: connector.imageUrl || '🏦',
      country: connector.country || 'BR',
      type: connector.type || 'PERSONAL_BANK', // PERSONAL_BANK, BUSINESS_BANK, INVESTMENT, etc.
      isOpenFinance: connector.isOpenFinance || false,
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

  /**
   * Busca o status detalhado de um item (para debug de erros)
   */
  async getItemStatus(itemId: string): Promise<any> {
    try {
      const provider = this.getProvider();

      // Verificar se o provider suporta getItem (Pluggy)
      if ('getItem' in provider) {
        return await (provider as any).getItem(itemId);
      }

      throw new Error('Provider does not support getItem');
    } catch (error) {
      console.error('Error fetching item status:', error);
      throw error;
    }
  }
}

export default new OpenBankingService();
