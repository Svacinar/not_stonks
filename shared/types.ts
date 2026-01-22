// Bank types
export type BankName = 'CSOB' | 'Raiffeisen' | 'Revolut';

// Transaction types
export interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  bank: BankName;
  category_id: number | null;
  created_at: string;
  original_amount: number | null;
  original_currency: string | null;
  conversion_rate: number | null;
}

export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  bank: BankName;
  originalCategory?: string;
  currency?: string;
}

// Category types
export interface Category {
  id: number;
  name: string;
  color: string;
}

// Category rule types
export interface CategoryRule {
  id: number;
  keyword: string;
  category_id: number;
  created_at: string;
}

// Upload log types
export interface UploadLog {
  id: number;
  filename: string;
  bank: BankName;
  transaction_count: number;
  upload_date: string;
}

// API response types
export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
}

export interface CategoryListResponse {
  categories: (Category & { transaction_count: number })[];
}

export interface RuleListResponse {
  rules: (CategoryRule & { category_name: string })[];
}

export interface UploadResponse {
  success: boolean;
  imported: number;
  duplicates: number;
  byBank: Record<BankName, number>;
}

// Response for parsing files (step 1 of import)
export interface ParseResponse {
  success: boolean;
  parsed: number;
  currencies: string[];
  byBank: Record<BankName, number>;
  byCurrency: Record<string, number>;
  sessionId: string;
}

// Request for completing import with conversion rates (step 2)
export interface ImportRequest {
  sessionId: string;
  conversionRates: Record<string, number>;
}

export interface TransactionStats {
  total_count: number;
  total_amount: number;
  by_category: { name: string; count: number; sum: number }[];
  by_bank: { name: BankName; count: number; sum: number }[];
  by_month: { month: string; count: number; sum: number }[];
  income_by_month: { month: string; count: number; sum: number }[];
  date_range: { min: string; max: string };
}
