import type { BankParser, ParsedTransaction } from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

/**
 * Raiffeisen Bank PDF Parser
 *
 * Parses Raiffeisen bank statements from PDF format.
 * Extracts transactions from the "Výpis pohybů" section.
 */
export class RaiffeisenParser implements BankParser {
  bankName = 'Raiffeisen';

  /**
   * Detects Raiffeisen files based on filename pattern or content markers
   */
  detect(buffer: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns for PDF
    if (lowerFilename.endsWith('.pdf')) {
      // RB PDF naming pattern: Statement_accountnumber_currency_year_month
      if (lowerFilename.match(/^statement_\d+_[a-z]{3}_\d{4}_\d{2,3}\.pdf$/i)) {
        return true;
      }
      if (lowerFilename.includes('raiffeisen') || lowerFilename.includes('rb_') || lowerFilename.includes('raiff')) {
        return true;
      }
    }

    // Check filename patterns for CSV (legacy)
    if (
      lowerFilename.includes('raiffeisen') ||
      lowerFilename.includes('rb_') ||
      lowerFilename.includes('raiff')
    ) {
      return true;
    }

    // Check PDF content markers
    if (this.isPdf(buffer)) {
      const preview = buffer.toString('latin1').slice(0, 10000).toLowerCase();
      if (
        preview.includes('raiffeisenbank') ||
        preview.includes('raiffeisen') ||
        preview.includes('rzbcczpp') // SWIFT/BIC code for Raiffeisen CZ
      ) {
        return true;
      }
    }

    // Check content markers for non-PDF
    const content = buffer.toString('utf-8').slice(0, 1000).toLowerCase();
    if (content.includes('raiffeisen') || content.includes('raiffeisenbank')) {
      return true;
    }

    return false;
  }

  /**
   * Check if buffer is a PDF
   */
  private isPdf(buffer: Buffer): boolean {
    return buffer.slice(0, 5).toString() === '%PDF-';
  }

  /**
   * Parses Raiffeisen PDF and returns transactions
   */
  async parse(buffer: Buffer): Promise<ParsedTransaction[]> {
    if (!this.isPdf(buffer)) {
      throw new Error('Raiffeisen parser currently only supports PDF format.');
    }

    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Extract year from "za období: 121. 12. 2025 - 31. 12. 2025" or similar
    // Note: the period number can be concatenated with the date
    const periodMatch = text.match(/za období:.*?(\d{4})/);
    const year = periodMatch ? periodMatch[1] : new Date().getFullYear().toString();

    const transactions: ParsedTransaction[] = [];

    // Split text into lines for processing
    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line);

    // Find transactions by looking for date patterns followed by amounts
    // Transaction pattern: Date (DD. MM. YYYY) ... Amount (-X XXX.XX CZK or X XXX.XX CZK)

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Look for date pattern: "DD. MM. YYYY" at start of a transaction block
      const dateMatch = line.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);

      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const txYear = dateMatch[3];
        const date = `${txYear}-${month}-${day}`;

        // Collect all lines until we find the amount (ends with " CZK")
        const blockLines: string[] = [];
        let amount: number | null = null;
        let j = i + 1;

        // Skip the valuta date if it immediately follows the posting date
        if (j < lines.length && lines[j].match(/^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}$/)) {
          j++; // Skip valuta date
        }

        while (j < lines.length) {
          const nextLine = lines[j];

          // Check if this line contains the amount (ends with " CZK")
          // Amount pattern: optional minus, digits with optional space thousand separators,
          // comma or dot decimal separator, exactly 2 decimal places
          // Note: sometimes VS number is concatenated before the amount, so we look for
          // the amount pattern at the end: -?X XXX,XX CZK or X XXX.XX CZK
          const amountMatch = nextLine.match(/(-?\d{1,3}(?:\s\d{3})*[.,]\d{2})\s*CZK$/);
          if (amountMatch) {
            amount = this.parseCzechAmount(amountMatch[1]);
            // Also extract any text before the amount as potential description
            const textBeforeAmount = nextLine.replace(/(-?\d{1,3}(?:\s\d{3})*[.,]\d{2})\s*CZK$/, '').trim();
            if (textBeforeAmount && !textBeforeAmount.match(/^\d+$/)) {
              blockLines.push(textBeforeAmount);
            }
            break;
          }

          // Check if we hit the next transaction (another date)
          if (nextLine.match(/^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}$/)) {
            break;
          }

          // Check if we hit the page footer/header
          if (nextLine.includes('Raiffeisenbank a.s.') ||
              nextLine.includes('Strana /') ||
              nextLine.match(/^K\d{7}\s+v\d+\.\d+/)) {
            j++;
            continue;
          }

          blockLines.push(nextLine);
          j++;
        }

        if (amount !== null && amount !== 0) {
          // Extract description from block
          const description = this.extractDescription(blockLines);

          if (description) {
            transactions.push({
              date,
              amount,
              description,
              bank: 'Raiffeisen',
            });
          }
        }

        // Move to the next potential transaction
        i = j;
      } else {
        i++;
      }
    }

    return transactions;
  }

  /**
   * Extract a meaningful description from transaction block lines
   */
  private extractDescription(lines: string[]): string {
    // Priority order for description extraction:
    // 1. Merchant name (format: "NAME; CITY; COUNTRY")
    // 2. Payee name (not an account number, not the account owner)
    // 3. Transaction type (Jednorázová úhrada, etc.)

    // Skip common non-descriptive lines
    const skipPatterns = [
      /^\d+$/, // Just numbers (transaction codes, etc.)
      /^KS:\d+$/, // KS codes
      /^VS:\d+$/, // VS codes
      /^SS:\d+$/, // SS codes
      /^PK:\s*\d+/, // Card numbers
      /^\d{4}$/, // 4-digit codes
      /^Platba$/, // Generic "Payment"
      /^Platba kartou$/, // Card payment category
      /^Úrok$/, // Interest category
      /^Poplatek$/, // Fee category
      /^\d+-?\d*\/\d{4}$/, // Account numbers (e.g., 251123697/0300)
      /^[A-Z]{2}\d{2}/, // IBAN prefixes
    ];

    // Look for merchant name (usually after card payment info)
    // Format: "MERCHANT NAME; CITY; COUNTRY"
    for (const line of lines) {
      if (line.includes(';') && !line.startsWith('PK:')) {
        // This looks like a merchant line
        const parts = line.split(';');
        return parts[0].trim();
      }
    }

    // Look for meaningful description lines
    const meaningfulLines: string[] = [];
    const transactionTypes: string[] = [];

    for (const line of lines) {
      // Skip patterns we want to ignore
      if (skipPatterns.some(pattern => pattern.test(line))) {
        continue;
      }

      // Skip very short lines (likely codes)
      if (line.length < 3) {
        continue;
      }

      // Skip lines that are just dates
      if (line.match(/^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}$/)) {
        continue;
      }

      // Track transaction types separately
      if (this.isTransactionType(line)) {
        transactionTypes.push(line);
        continue;
      }

      meaningfulLines.push(line);
    }

    // Find a good payee name
    for (const line of meaningfulLines) {
      // Skip if it looks like an account-related info
      if (line.match(/IC\s*\d+/) || line.match(/^\d+-?\d*$/)) {
        continue;
      }

      // This looks like a valid payee name
      return this.cleanDescription(line);
    }

    // Use transaction type if no payee found
    if (transactionTypes.length > 0) {
      return this.cleanDescription(transactionTypes[0]);
    }

    // Fallback: return first meaningful line
    if (meaningfulLines.length > 0) {
      return this.cleanDescription(meaningfulLines[0]);
    }

    return 'Unknown transaction';
  }

  /**
   * Check if a line is a transaction type description
   */
  private isTransactionType(line: string): boolean {
    const transactionTypes = [
      'Platba na internetu Apple Pay',
      'Příchozí úhrada',
      'Jednorázová úhrada',
      'Příchozí okamžitá úhrada',
      'Odchozí okamžitá úhrada',
      'Platba kartou',
      'Splátka úvěru',
      'Úrok z úvěru',
      'Vedení účtu',
    ];
    return transactionTypes.some(type => line.includes(type));
  }

  /**
   * Parse Czech formatted amount (e.g., "-1 462,00" or "33 500,00" or "109 825.00")
   */
  private parseCzechAmount(amountStr: string): number {
    // Remove spaces and replace comma with dot
    const cleaned = amountStr.replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Clean up description text
   */
  private cleanDescription(description: string): string {
    let cleaned = description
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^KS:\d+\s*/, '') // Remove leading KS codes
      .replace(/^VS:\d+\s*/, '') // Remove leading VS codes
      .trim();

    // Fix concatenated category+type (e.g., "PlatbaSplátka úvěru" -> "Splátka úvěru")
    // These are PDF extraction artifacts
    const categoryPrefixes = ['Platba', 'Úrok', 'Poplatek'];
    for (const prefix of categoryPrefixes) {
      if (cleaned.startsWith(prefix) && cleaned.length > prefix.length) {
        const rest = cleaned.slice(prefix.length);
        // Only remove if what follows starts with capital letter (new word)
        if (rest.match(/^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/)) {
          cleaned = rest;
          break;
        }
      }
    }

    return cleaned;
  }
}
