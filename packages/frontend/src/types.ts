export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number?: string;
  iban?: string;
  account_type?: string;
  balance: number;
  currency: string;
  connected_at: number;
  last_sync_at?: number;
  status: 'active' | 'expired' | 'disconnected';
  created_at: number;
  updated_at: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  transaction_id?: string;
  date: number;
  amount: number;
  currency: string;
  description?: string;
  merchant?: string;
  category?: string;
  type: 'debit' | 'credit';
  balance_after?: number;
  reference?: string;
  status: 'completed' | 'pending' | 'cancelled';
  created_at: number;
  updated_at: number;
}

export interface Bank {
  id: string;
  name: string;
  logo: string;
  country: string;
}

export interface DashboardStats {
  total_balance: number;
  total_income: number;
  total_expenses: number;
  transaction_count: number;
  period_start: string;
  period_end: string;
}

export interface CategoryStats {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyStats {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface MonthlyStats {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface TopMerchant {
  merchant: string;
  category: string;
  total: number;
  count: number;
}

export interface Category {
  id?: string;
  category: string;
  name?: string;
  icon: string;
  color: string;
  keywords?: string[];
}
