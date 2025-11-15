import axios, { AxiosInstance } from 'axios';

const ASAAS_API_URL = process.env.ASAAS_SANDBOX === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://www.asaas.com/api/v3';

interface AsaasCustomer {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
}

interface AsaasSubscription {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
}

interface AsaasPayment {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
}

export class AsaasService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: ASAAS_API_URL,
      headers: {
        'access_token': process.env.ASAAS_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Criar cliente no Asaas
   */
  async createCustomer(data: AsaasCustomer) {
    try {
      const response = await this.api.post('/customers', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating Asaas customer:', error.response?.data || error.message);
      throw new Error('Falha ao criar cliente no Asaas');
    }
  }

  /**
   * Buscar cliente por email
   */
  async getCustomerByEmail(email: string) {
    try {
      const response = await this.api.get('/customers', {
        params: { email }
      });
      return response.data.data?.[0] || null;
    } catch (error: any) {
      console.error('Error fetching Asaas customer:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Criar assinatura recorrente
   */
  async createSubscription(data: AsaasSubscription) {
    try {
      const response = await this.api.post('/subscriptions', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating Asaas subscription:', error.response?.data || error.message);
      throw new Error('Falha ao criar assinatura no Asaas');
    }
  }

  /**
   * Criar pagamento único (à vista)
   */
  async createPayment(data: AsaasPayment) {
    try {
      const response = await this.api.post('/payments', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating Asaas payment:', error.response?.data || error.message);
      throw new Error('Falha ao criar pagamento no Asaas');
    }
  }

  /**
   * Buscar assinatura
   */
  async getSubscription(id: string) {
    try {
      const response = await this.api.get(`/subscriptions/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Asaas subscription:', error.response?.data || error.message);
      throw new Error('Falha ao buscar assinatura no Asaas');
    }
  }

  /**
   * Buscar pagamento
   */
  async getPayment(id: string) {
    try {
      const response = await this.api.get(`/payments/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Asaas payment:', error.response?.data || error.message);
      throw new Error('Falha ao buscar pagamento no Asaas');
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(id: string) {
    try {
      const response = await this.api.delete(`/subscriptions/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error canceling Asaas subscription:', error.response?.data || error.message);
      throw new Error('Falha ao cancelar assinatura no Asaas');
    }
  }

  /**
   * Atualizar assinatura
   */
  async updateSubscription(id: string, data: Partial<AsaasSubscription>) {
    try {
      const response = await this.api.put(`/subscriptions/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating Asaas subscription:', error.response?.data || error.message);
      throw new Error('Falha ao atualizar assinatura no Asaas');
    }
  }

  /**
   * Listar pagamentos de uma assinatura
   */
  async getSubscriptionPayments(subscriptionId: string) {
    try {
      const response = await this.api.get('/payments', {
        params: { subscription: subscriptionId }
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching subscription payments:', error.response?.data || error.message);
      return [];
    }
  }
}

export const asaasService = new AsaasService();
