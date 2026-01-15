export type BankName = 'CSOB' | 'Raiffeisen' | 'Revolut';
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
export interface Category {
    id: number;
    name: string;
    color: string;
}
export interface CategoryRule {
    id: number;
    keyword: string;
    category_id: number;
    created_at: string;
}
export interface UploadLog {
    id: number;
    filename: string;
    bank: BankName;
    transaction_count: number;
    upload_date: string;
}
export interface TransactionListResponse {
    transactions: Transaction[];
    total: number;
}
export interface CategoryListResponse {
    categories: (Category & {
        transaction_count: number;
    })[];
}
export interface RuleListResponse {
    rules: (CategoryRule & {
        category_name: string;
    })[];
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
    by_category: {
        name: string;
        count: number;
        sum: number;
    }[];
    by_bank: {
        name: BankName;
        count: number;
        sum: number;
    }[];
    by_month: {
        month: string;
        count: number;
        sum: number;
    }[];
    date_range: {
        min: string;
        max: string;
    };
}
//# sourceMappingURL=types.d.ts.map