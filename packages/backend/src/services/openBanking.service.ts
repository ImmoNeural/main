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
   * Se a API do Pluggy falhar, propaga o erro para o frontend mostrar mensagem apropriada
   */
  async getAvailableBanks(country: string = 'BR') {
    console.log('\n📋 [OpenBanking] getAvailableBanks START');
    console.log('   Country:', country);
    console.log('   Provider type:', this.providerType);

    const provider = this.getProvider();
    console.log(`   Provider instance:`, provider.constructor.name);

    // Pluggy (Brasil)
    if ('getConnectors' in provider) {
      console.log('   ✅ Provider has getConnectors (Pluggy detected)');
      console.log('   🔄 Calling provider.getConnectors...');

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
          console.log('📋 [OpenBanking] getAvailableBanks END\n');
          return allBanks;
        }

        console.log(`   ✅ Returning ${banks.length} banks from Pluggy`);
        console.log('📋 [OpenBanking] getAvailableBanks END\n');
        return banks;
      }

      // Pluggy retornou 0 conectores - isso é um erro
      console.error('   ❌ Pluggy returned 0 connectors');
      console.log('📋 [OpenBanking] getAvailableBanks END\n');
      throw new Error('Nenhum banco disponível no momento. Por favor, tente novamente mais tarde.');
    }

    // Belvo (América Latina) ou Nordigen (Europa)
    if ('getInstitutions' in provider) {
      const providerName = provider.constructor.name;
      console.log(`   Provider with getInstitutions: ${providerName}`);

      const institutions = await (provider as any).getInstitutions(country);

      if (providerName === 'BelvoService') {
        console.log(`   Using Belvo institutions (${institutions.length} found)`);
        console.log('📋 [OpenBanking] getAvailableBanks END\n');
        return this.mapBelvoInstitutionsToBanks(institutions);
      } else {
        console.log(`   Using Nordigen institutions (${institutions.length} found)`);
        console.log('📋 [OpenBanking] getAvailableBanks END\n');
        return this.mapInstitutionsToBanks(institutions);
      }
    }

    // Tink (Europa)
    if ('getProviders' in provider) {
      console.log('   Using Tink providers');
      const providers = await (provider as any).getProviders(country);
      console.log('📋 [OpenBanking] getAvailableBanks END\n');
      return this.mapProvidersToBanks(providers);
    }

    // Nenhum provedor configurado
    console.error('   ❌ No banking provider configured');
    console.log('📋 [OpenBanking] getAvailableBanks END\n');
    throw new Error('Serviço de conexão bancária não configurado. Entre em contato com o suporte.');
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
