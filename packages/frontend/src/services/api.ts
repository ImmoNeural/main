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
      console.log(`🔑 API request with token: ${config.url} (token: ${token.substring(0, 20)}...)`);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log(`⚠️ API request without token: ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('❌ 401 Unauthorized:', error.response?.data?.error || 'Token inválido');

      // NÃO fazer logout automático se estiver conectando banco
      // O Pluggy Connect Widget pode causar requisições que falham temporariamente
      const isConnectingBank = window.location.pathname.includes('/connect-bank') ||
                               window.location.pathname.includes('/accounts');

      // Verificar se há uma flag de conexão bancária em andamento
      const bankConnectionInProgress = sessionStorage.getItem('bank_connection_in_progress');

      if (isConnectingBank || bankConnectionInProgress) {
        console.log('⚠️ 401 durante/após conexão bancária - ignorando logout automático');
        return Promise.reject(error);
      }

      console.log('🔄 Clearing local storage and redirecting to login...');

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
      initial_balance: number | null;
      initial_balance_date: string | null;
    }>('/transactions', { params }),

  getTransaction: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`),

  updateCategory: (id: string, category: string) =>
    api.patch(`/transactions/${id}/category`, { category }),

  getCategories: () =>
    api.get<Category[]>('/transactions/categories/list'),

  recategorizeAll: () =>
    api.post<{ success: boolean; total: number; updated: number; unchanged: number; categorized: number; uncategorized: number; message: string }>('/transactions/recategorize'),

  findSimilar: (description: string, merchant?: string, excludeId?: string, newCategory?: string) =>
    api.post<{
      similar: Array<Transaction & { matchScore: number; matchedWords: string[] }>;
      keywords: string[];
      totalMatches: number;
    }>('/transactions/find-similar', { description, merchant, excludeId, newCategory }),

  bulkUpdateCategory: (transactionIds: string[], newCategory: string) =>
    api.post<{ success: boolean; updated: number; category: string; message: string }>(
      '/transactions/bulk-update-category',
      { transactionIds, newCategory }
    ),

  deleteAll: () =>
    api.delete<{ success: boolean; deleted: number; message: string }>('/transactions/all'),

  debugCategorization: (params: { description?: string; merchant?: string; amount?: number; transactionId?: string }) =>
    api.post<{
      input: {
        description: string;
        merchant: string;
        amount: number;
        transactionId: string | null;
      };
      result: {
        category: string;
        subcategory: string;
        icon: string;
        color: string;
        confidence: number;
        matchedBy: string;
      };
      analysis: {
        isPassing: boolean;
        threshold: number;
        willBeCategorizad: string;
        reason: string;
      };
    }>('/transactions/debug-categorization', params),

  importTransactions: (data: {
    transactions: Array<{
      date: string;
      amount: number;
      description?: string;
      merchant?: string;
      category?: string;
      currency?: string;
    }>;
    account_id?: string;
  }) =>
    api.post<{
      success: boolean;
      imported: number;
      errors?: string[];
      account_id: string;
      message: string;
    }>('/transactions/import', data),
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

  getWeeklyStats: (days?: number) =>
    api.get<import('../types').WeeklyStats[]>('/dashboard/weekly-stats', {
      params: { days },
    }),

  getMonthlyStatsByCategory: (months?: number) =>
    api.get<Array<{
      month: string;
      monthLabel: string;
      expenses: { total: number; byCategory: Array<{ category: string; amount: number }> };
      income: { total: number; byCategory: Array<{ category: string; amount: number }> };
    }>>('/dashboard/monthly-stats-by-category', {
      params: { months },
    }),
};

// Budget APIs
export const budgetApi = {
  // Get all budgets for the current user
  getAllBudgets: () =>
    api.get<Record<string, number>>('/budgets'),

  // Get budget for a specific category
  getBudget: (categoryName: string) =>
    api.get<{ category_name: string; budget_value: number | null }>(`/budgets/${encodeURIComponent(categoryName)}`),

  // Create or update a budget
  saveBudget: (categoryName: string, budgetValue: number) =>
    api.post('/budgets', { category_name: categoryName, budget_value: budgetValue }),

  // Update an existing budget
  updateBudget: (categoryName: string, budgetValue: number) =>
    api.put(`/budgets/${encodeURIComponent(categoryName)}`, { budget_value: budgetValue }),

  // Delete a budget (revert to default)
  deleteBudget: (categoryName: string) =>
    api.delete(`/budgets/${encodeURIComponent(categoryName)}`),
};

// Subscription APIs
export const subscriptionApi = {
  getCurrentSubscription: () =>
    api.get('/subscriptions/current'),

  createSubscription: (planType: string, paymentCycle: string) =>
    api.post('/subscriptions/create', { planType, paymentCycle }),

  cancelCheckout: () =>
    api.post('/subscriptions/cancel-checkout'),

  cancelSubscription: () =>
    api.post('/subscriptions/cancel'),

  getCustomerPortal: () =>
    api.get('/subscriptions/portal'),
};

export default api;
