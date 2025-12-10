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
    this.providerType = (process.env.OPEN_BANKING_PROVIDER || 'mock') as ProviderType;
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
    const provider = this.getProvider();

    // Pluggy (Brasil)
    if ('getConnectors' in provider) {
      const connectors = await (provider as any).getConnectors(country);

      if (connectors.length > 0) {
        return this.mapConnectorsToBanks(connectors);
      }

      throw new Error('Nenhum banco disponível no momento. Por favor, tente novamente mais tarde.');
    }

    // Belvo (América Latina) ou Nordigen (Europa)
    if ('getInstitutions' in provider) {
      const providerName = provider.constructor.name;
      const institutions = await (provider as any).getInstitutions(country);

      if (providerName === 'BelvoService') {
        return this.mapBelvoInstitutionsToBanks(institutions);
      } else {
        return this.mapInstitutionsToBanks(institutions);
      }
    }

    // Tink (Europa)
    if ('getProviders' in provider) {
      const providers = await (provider as any).getProviders(country);
      return this.mapProvidersToBanks(providers);
    }

    throw new Error('Serviço de conexão bancária não configurado. Entre em contato com o suporte.');
  }

  /**
   * Mapeia conectores do Pluggy para nosso formato
   * A filtragem por Open Finance já é feita na API (isOpenFinance=true)
   */
  private mapConnectorsToBanks(connectors: any[]) {
    // Mapear diretamente sem filtro adicional (API já filtra por isOpenFinance=true)
    return connectors.map(connector => ({
      id: connector.id.toString(),
      name: connector.name,
      logo: connector.imageUrl || '🏦',
      country: connector.country || 'BR',
      type: connector.type || 'PERSONAL_BANK', // PERSONAL_BANK, BUSINESS_BANK, INVESTMENT, etc.
      isOpenFinance: true, // Todos são Open Finance (filtrado na API)
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
      throw new Error('Failed to initiate bank authorization');
    }
  }

  /**
   * Troca o código de autorização por tokens de acesso
   * @param code - Código de autorização (itemId no caso do Pluggy)
   * @param state - State/token
   * @param quickMode - Se true, retorna imediatamente sem esperar sync completo (evita 504)
   */
  async exchangeCodeForToken(code: string, state: string, quickMode: boolean = false): Promise<OpenBankingTokenResponse> {
    try {
      const provider = this.getProvider();

      // Verificar se o provider suporta quickMode
      if ('exchangeCodeForToken' in provider && provider.exchangeCodeForToken.length >= 2) {
        return await (provider as any).exchangeCodeForToken(code, quickMode);
      }

      return await provider.exchangeCodeForToken(code, state);
    } catch (error: any) {
      // Repassar a mensagem de erro original se disponível
      const errorMessage = error.message || 'Failed to exchange authorization code';
      console.error('[OpenBanking] ❌ exchangeCodeForToken error:', errorMessage);
      throw new Error(errorMessage);
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
      throw error;
    }
  }

  /**
   * Dispara atualização de dados do banco via Open Finance
   * Força o provedor a buscar dados frescos do banco
   */
  async updateItem(itemId: string): Promise<void> {
    try {
      const provider = this.getProvider();

      // Verificar se o provider suporta updateItem (Pluggy)
      if ('updateItem' in provider) {
        await (provider as any).updateItem(itemId);
        console.log(`[OpenBanking] ✅ Item ${itemId} update triggered`);
        return;
      }

      console.log(`[OpenBanking] ⚠️ Provider does not support updateItem, skipping...`);
    } catch (error: any) {
      console.error(`[OpenBanking] ❌ Failed to update item ${itemId}:`, error.message);
      // Não propagar erro - continuar com sync mesmo se update falhar
    }
  }

  /**
   * Aguarda o item ficar pronto após trigger de update
   */
  async waitForItemReady(itemId: string, maxAttempts: number = 30): Promise<boolean> {
    try {
      const provider = this.getProvider();

      if (!('getItem' in provider)) {
        return true; // Provider não suporta, assumir pronto
      }

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const item = await (provider as any).getItem(itemId, 1); // 1 retry por tentativa

        if (item.status === 'UPDATED') {
          console.log(`[OpenBanking] ✅ Item ${itemId} is ready (attempt ${attempt}/${maxAttempts})`);
          return true;
        }

        if (item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED') {
          console.error(`[OpenBanking] ❌ Item ${itemId} has error status: ${item.status}`);
          return false;
        }

        // Status UPDATING - aguardar
        if (attempt < maxAttempts) {
          console.log(`[OpenBanking] ⏳ Item ${itemId} status: ${item.status}, waiting... (${attempt}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`[OpenBanking] ⚠️ Item ${itemId} timeout after ${maxAttempts} attempts`);
      return false; // Timeout, mas continuar mesmo assim
    } catch (error: any) {
      console.error(`[OpenBanking] ❌ Error waiting for item ${itemId}:`, error.message);
      return false;
    }
  }
}

export default new OpenBankingService();
