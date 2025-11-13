export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number?: string;
  iban?: string;
  account_type?: string;
  balance: number;
  currency: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number;
  consent_id?: string;
  consent_expires_at?: number;
  connected_at: number;
  last_sync_at?: number;
  status: 'active' | 'expired' | 'disconnected';
  provider_account_id?: string; // ID da conta no provedor (ex: Pluggy account ID)
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

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  keywords?: string;
  user_id: string;
  created_at: number;
}

export interface OpenBankingAuthRequest {
  bank_id: string;
  redirect_uri: string;
  user_id: string;
}

export interface OpenBankingAuthResponse {
  authorization_url: string;
  state: string;
  consent_id: string;
}

export interface OpenBankingTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface OpenBankingAccount {
  id: string;
  iban?: string;
  currency: string;
  name?: string;
  account_type?: string;
  balance?: {
    amount: number;
    currency: string;
  };
}

export interface OpenBankingTransaction {
  transaction_id: string;
  booking_date: string;
  value_date?: string;
  transaction_amount: {
    amount: number;
    currency: string;
  };
  creditor_name?: string;
  debtor_name?: string;
  remittance_information?: string;
  balance_after_transaction?: {
    amount: number;
    currency: string;
  };
  status?: string;
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
  startDate: string; // ISO string
  endDate: string; // ISO string
  expenses: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  income: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
}
