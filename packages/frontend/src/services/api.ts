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

// Bank APIs
export const bankApi = {
  getAvailableBanks: () => api.get<Bank[]>('/bank/available'),

  connectBank: (bankId: string, userId?: string) =>
    api.post('/bank/connect', { bank_id: bankId, user_id: userId }),

  handleCallback: (code: string, state: string, bankName: string, userId?: string) =>
    api.post('/bank/callback', { code, state, bank_name: bankName, user_id: userId }),

  getAccounts: (userId?: string) =>
    api.get<BankAccount[]>('/bank/accounts', { params: { user_id: userId } }),

  syncAccount: (accountId: string) =>
    api.post(`/bank/accounts/${accountId}/sync`),

  deleteAccount: (accountId: string) =>
    api.delete(`/bank/accounts/${accountId}`),
};

// Transaction APIs
export const transactionApi = {
  getTransactions: (params?: {
    user_id?: string;
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
  getStats: (userId?: string, days?: number) =>
    api.get<DashboardStats>('/dashboard/stats', {
      params: { user_id: userId, days },
    }),

  getExpensesByCategory: (userId?: string, days?: number) =>
    api.get<CategoryStats[]>('/dashboard/expenses-by-category', {
      params: { user_id: userId, days },
    }),

  getDailyStats: (userId?: string, days?: number) =>
    api.get<DailyStats[]>('/dashboard/daily-stats', {
      params: { user_id: userId, days },
    }),

  getTopMerchants: (userId?: string, days?: number, limit?: number) =>
    api.get<TopMerchant[]>('/dashboard/top-merchants', {
      params: { user_id: userId, days, limit },
    }),

  getMonthlyComparison: (userId?: string, months?: number) =>
    api.get<MonthlyStats[]>('/dashboard/monthly-comparison', {
      params: { user_id: userId, months },
    }),
};

export default api;
