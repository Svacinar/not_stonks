import type { BankParser, ParsedTransaction } from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

/**
 * CSOB Bank PDF Parser
 *
 * Parses CSOB bank statements from PDF format.
 * Extracts transactions from the "Přehled pohybů na účtu" section.
 */
export class CsobParser implements BankParser {
  bankName = 'CSOB';

  /**
   * Detects CSOB files based on filename pattern or content markers
   */
  detect(buffer: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns for PDF
    if (lowerFilename.endsWith('.pdf')) {
      // CSOB PDF naming pattern: account number with date
      if (lowerFilename.match(/^\d+_\d{8}_\d+/)) {
        return true;
      }
      if (lowerFilename.includes('csob') || lowerFilename.includes('čsob')) {
        return true;
      }
    }

    // Check filename patterns for CSV (future support)
    if (lowerFilename.includes('csob') || lowerFilename.includes('čsob')) {
      return true;
    }

    // Check PDF content markers
    if (this.isPdf(buffer)) {
      const preview = buffer.toString('latin1').slice(0, 5000).toLowerCase();
      if (
        preview.includes('československá obchodní banka') ||
        preview.includes('csob') ||
        preview.includes('výpis z účtu')
      ) {
        return true;
      }
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
   * Parses CSOB PDF and returns transactions
   */
  async parse(buffer: Buffer): Promise<ParsedTransaction[]> {
    if (!this.isPdf(buffer)) {
      throw new Error('CSOB parser currently only supports PDF format. CSV support coming soon.');
    }

    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Extract year from "Období:1. 12. 2025 - 31. 12. 2025"
    const periodMatch = text.match(/Období:\s*\d+\.\s*\d+\.\s*(\d{4})/);
    const year = periodMatch ? periodMatch[1] : new Date().getFullYear().toString();

    const transactions: ParsedTransaction[] = [];

    // Split text into lines for processing
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line);

    // Transaction line pattern:
    // DD.MM.Description IDAmount Balance
    // Examples:
    // 01.12.Transakce platební kartou 9613-1 462,0015 352,52
    // 11.12.Příchozí úhrada Jan Novak123456 500,0039 726,14

    // Regex to match transaction lines:
    // - Starts with DD.MM.
    // - Has description text
    // - Has 4-digit ID
    // - Has amount (negative or positive) with Czech format
    // - Has balance with Czech format
    const transactionRegex = /^(\d{2})\.(\d{2})\.(.+?)(\d{4})(-?\d[\d\s]*,\d{2})(-?\d[\d\s]*,\d{2})$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip header lines
      if (
        line.includes('Vážená klientko') ||
        line.includes('Víte, že si u nás') ||
        line.startsWith('Datum') ||
        line.startsWith('Valuta') ||
        line === 'Označení platby' ||
        line.includes('Identifikace') ||
        line.includes('Částka') && line.includes('Zůstatek')
      ) {
        continue;
      }

      const match = line.match(transactionRegex);
      if (match) {
        const day = match[1];
        const month = match[2];
        const description = match[3].trim();
        // match[4] is the ID
        const amountStr = match[5];
        // match[6] is the balance

        const date = `${year}-${month}-${day}`;
        const amount = this.parseCzechAmount(amountStr);

        // Look for "Místo:" in following lines for better description
        let betterDescription = description;
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j];
          if (nextLine.startsWith('Místo:')) {
            betterDescription = nextLine.replace('Místo:', '').trim();
            break;
          }
          // Stop if we hit another transaction line
          if (nextLine.match(/^\d{2}\.\d{2}\./)) {
            break;
          }
        }

        if (amount !== 0) {
          transactions.push({
            date,
            amount,
            description: this.cleanDescription(betterDescription),
            bank: 'CSOB',
          });
        }
      }
    }

    return transactions;
  }

  /**
   * Parse Czech formatted amount (e.g., "-1 462,00" or "33 500,00")
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
    return description
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}
