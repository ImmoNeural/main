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
  subcategory?: string;
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
  initial_balance: number | null; // Saldo no início do período (pode ser null se não houver dados)
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

export interface WeeklyStats {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  expenses: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  income: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
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

export type SubscriptionPlanType = 'manual' | 'conectado' | 'conectado_plus';
export type SubscriptionStatus = 'active' | 'pending' | 'canceled' | 'expired' | 'trial';
export type PaymentType = 'credit_card' | 'boleto' | 'pix';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: SubscriptionPlanType;
  plan_name: string;
  plan_price: number;
  status: SubscriptionStatus;
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  payment_method?: PaymentType;
  payment_processor?: string;
  payment_processor_subscription_id?: string;
  payment_processor_customer_id?: string;
  max_connected_accounts: number;
  auto_renew: boolean;
  next_billing_date?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  canceled_at?: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentType;
  payment_status: string;
  payment_processor: string;
  payment_processor_payment_id?: string;
  payment_processor_invoice_url?: string;
  payment_date?: string;
  due_date?: string;
  metadata?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}
