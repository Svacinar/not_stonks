import type { BankParser, ParsedTransaction } from './types';

/**
 * Revolut CSV Parser
 *
 * Supports Revolut account statements exported as CSV.
 * Handles multiple languages (Spanish, English, etc.) based on the CSV headers.
 *
 * Spanish headers:
 *   Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
 *
 * English headers:
 *   Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
 */
export class RevolutParser implements BankParser {
  bankName = 'Revolut';

  // Header mappings for different languages
  private static readonly HEADER_MAPPINGS = {
    spanish: {
      type: 'tipo',
      startDate: 'fecha de inicio',
      description: 'descripción',
      amount: 'importe',
      fee: 'comisión',
      currency: 'divisa',
    },
    english: {
      type: 'type',
      startDate: 'started date',
      description: 'description',
      amount: 'amount',
      fee: 'fee',
      currency: 'currency',
    },
  };

  /**
   * Detects Revolut files based on filename pattern or content markers
   */
  detect(buffer: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns
    if (lowerFilename.includes('revolut')) {
      return true;
    }

    // Revolut account statement pattern: account-statement_YYYY-MM-DD_YYYY-MM-DD_locale_hash.csv
    if (lowerFilename.startsWith('account-statement_')) {
      return true;
    }

    // Check for Revolut-specific file extensions/patterns
    if (lowerFilename.match(/revolut.*\.(csv|xlsx)$/)) {
      return true;
    }

    // Check content markers
    const content = buffer.toString('utf-8').slice(0, 500).toLowerCase();

    // English headers
    if (content.includes('completed date') || content.includes('started date')) {
      return true;
    }

    // Spanish headers
    if (content.includes('fecha de inicio') || content.includes('fecha de finalización')) {
      return true;
    }

    // Generic revolut reference
    if (content.includes('revolut')) {
      return true;
    }

    return false;
  }

  /**
   * Parses CSV content, handling quoted fields with commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Detects header language and returns column indices
   */
  private detectHeaderMapping(
    headers: string[]
  ): { type: number; startDate: number; description: number; amount: number; fee: number; currency: number } | null {
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    // Try Spanish first
    const spanishMapping = RevolutParser.HEADER_MAPPINGS.spanish;
    const typeIdxEs = lowerHeaders.findIndex((h) => h === spanishMapping.type);
    const startDateIdxEs = lowerHeaders.findIndex((h) => h === spanishMapping.startDate);
    const descIdxEs = lowerHeaders.findIndex((h) => h === spanishMapping.description);
    const amountIdxEs = lowerHeaders.findIndex((h) => h === spanishMapping.amount);
    const feeIdxEs = lowerHeaders.findIndex((h) => h === spanishMapping.fee);
    const currencyIdxEs = lowerHeaders.findIndex((h) => h === spanishMapping.currency);

    if (typeIdxEs !== -1 && startDateIdxEs !== -1 && descIdxEs !== -1 && amountIdxEs !== -1) {
      return {
        type: typeIdxEs,
        startDate: startDateIdxEs,
        description: descIdxEs,
        amount: amountIdxEs,
        fee: feeIdxEs,
        currency: currencyIdxEs,
      };
    }

    // Try English
    const englishMapping = RevolutParser.HEADER_MAPPINGS.english;
    const typeIdxEn = lowerHeaders.findIndex((h) => h === englishMapping.type);
    const startDateIdxEn = lowerHeaders.findIndex((h) => h === englishMapping.startDate);
    const descIdxEn = lowerHeaders.findIndex((h) => h === englishMapping.description);
    const amountIdxEn = lowerHeaders.findIndex((h) => h === englishMapping.amount);
    const feeIdxEn = lowerHeaders.findIndex((h) => h === englishMapping.fee);
    const currencyIdxEn = lowerHeaders.findIndex((h) => h === englishMapping.currency);

    if (typeIdxEn !== -1 && startDateIdxEn !== -1 && descIdxEn !== -1 && amountIdxEn !== -1) {
      return {
        type: typeIdxEn,
        startDate: startDateIdxEn,
        description: descIdxEn,
        amount: amountIdxEn,
        fee: feeIdxEn,
        currency: currencyIdxEn,
      };
    }

    return null;
  }

  /**
   * Extracts date (YYYY-MM-DD) from datetime string (YYYY-MM-DD HH:MM:SS)
   */
  private extractDate(datetime: string): string {
    // Handle both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DD" formats
    const dateMatch = datetime.match(/^(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[1] : datetime.slice(0, 10);
  }

  /**
   * Parses amount string to number, handling locale-specific formatting
   */
  private parseAmount(amountStr: string): number {
    // Remove any spaces and handle both comma and dot as decimal separator
    let cleaned = amountStr.trim();

    // If the string contains both comma and dot, determine which is the decimal separator
    // European format: 1.234,56 (dot as thousands, comma as decimal)
    // US format: 1,234.56 (comma as thousands, dot as decimal)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // European format: comma is decimal separator
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format or no thousands separator: dot is decimal separator
      cleaned = cleaned.replace(/,/g, '');
    }

    return parseFloat(cleaned) || 0;
  }

  /**
   * Parses Revolut CSV and returns transactions
   */
  async parse(buffer: Buffer): Promise<ParsedTransaction[]> {
    const content = buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return [];
    }

    // Parse header row
    const headers = this.parseCSVLine(lines[0]);
    const mapping = this.detectHeaderMapping(headers);

    if (!mapping) {
      throw new Error(
        'Unable to detect Revolut CSV format. Expected headers not found. ' +
          'Supported languages: Spanish (Tipo, Fecha de inicio, etc.) or English (Type, Started Date, etc.)'
      );
    }

    const transactions: ParsedTransaction[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = this.parseCSVLine(line);

      const type = fields[mapping.type] || '';
      const startDate = fields[mapping.startDate] || '';
      const description = fields[mapping.description] || '';
      const amountStr = fields[mapping.amount] || '0';
      const feeStr = mapping.fee !== -1 ? fields[mapping.fee] || '0' : '0';
      const currency = mapping.currency !== -1 ? (fields[mapping.currency] || 'CZK').toUpperCase() : 'CZK';

      const amount = this.parseAmount(amountStr);
      const fee = this.parseAmount(feeStr);

      // Skip rows with no date or description
      if (!startDate || !description) continue;

      const date = this.extractDate(startDate);

      // Main transaction (if amount is non-zero)
      if (amount !== 0) {
        transactions.push({
          date,
          amount,
          description,
          bank: 'Revolut',
          originalCategory: type,
          currency,
        });
      }

      // Fee as separate transaction (if fee is non-zero)
      if (fee !== 0) {
        transactions.push({
          date,
          amount: -Math.abs(fee), // Fees are always expenses
          description: `Fee: ${description}`,
          bank: 'Revolut',
          originalCategory: 'Fee',
          currency,
        });
      }

      // Handle case where amount is 0 but fee is non-zero (e.g., monthly plan fees)
      if (amount === 0 && fee === 0 && type) {
        // This might be a zero-value transaction, skip it
        continue;
      }
    }

    return transactions;
  }
}
