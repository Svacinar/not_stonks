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
}

export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  bank: BankName;
  originalCategory?: string;
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

export interface TransactionStats {
  total_count: number;
  total_amount: number;
  by_category: { name: string; count: number; sum: number }[];
  by_bank: { name: BankName; count: number; sum: number }[];
  by_month: { month: string; count: number; sum: number }[];
  income_by_month: { month: string; count: number; sum: number }[];
  date_range: { min: string; max: string };
}
