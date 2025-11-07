import axios from 'axios';
import type {
  Bank,
  BankAccount,
  Transaction,
  DashboardStats,
  CategoryStats,
  DailyStats,
  MonthlyStats,
  TopMerchant,
  Category,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirecionar para login apenas se não estiver já na página de login/register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: () =>
    api.post('/auth/logout'),

  getMe: () =>
    api.get('/auth/me'),
};

// Bank APIs
export const bankApi = {
  getAvailableBanks: () => api.get<Bank[]>('/bank/available'),

  connectBank: (bankId: string) =>
    api.post('/bank/connect', { bank_id: bankId }),

  handleCallback: (code: string, state: string, bankName: string) =>
    api.post('/bank/callback', { code, state, bank_name: bankName }),

  getAccounts: () =>
    api.get<BankAccount[]>('/bank/accounts'),

  syncAccount: (accountId: string) =>
    api.post(`/bank/accounts/${accountId}/sync`),

  deleteAccount: (accountId: string) =>
    api.delete(`/bank/accounts/${accountId}`),
};

// Transaction APIs
export const transactionApi = {
  getTransactions: (params?: {
    account_id?: string;
    category?: string;
    type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get<{
      transactions: Transaction[];
      total: number;
      limit: number;
      offset: number;
    }>('/transactions', { params }),

  getTransaction: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`),

  updateCategory: (id: string, category: string) =>
    api.patch(`/transactions/${id}/category`, { category }),

  getCategories: () =>
    api.get<Category[]>('/transactions/categories/list'),
};

// Dashboard APIs
export const dashboardApi = {
  getStats: (days?: number) =>
    api.get<DashboardStats>('/dashboard/stats', {
      params: { days },
    }),

  getExpensesByCategory: (days?: number) =>
    api.get<CategoryStats[]>('/dashboard/expenses-by-category', {
      params: { days },
    }),

  getDailyStats: (days?: number) =>
    api.get<DailyStats[]>('/dashboard/daily-stats', {
      params: { days },
    }),

  getTopMerchants: (days?: number, limit?: number) =>
    api.get<TopMerchant[]>('/dashboard/top-merchants', {
      params: { days, limit },
    }),

  getMonthlyComparison: (months?: number) =>
    api.get<MonthlyStats[]>('/dashboard/monthly-comparison', {
      params: { months },
    }),
};

export default api;
