import type { BankParser, ParsedTransaction } from './types';

/**
 * Raiffeisen Bank CSV Parser (Dummy Implementation)
 *
 * Will be replaced with real implementation when sample files are provided.
 * Currently returns realistic sample transactions for development/testing.
 */
export class RaiffeisenParser implements BankParser {
  bankName = 'Raiffeisen';

  /**
   * Detects Raiffeisen files based on filename pattern or content markers
   * Real implementation will check CSV headers and format
   */
  detect(buffer: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns
    if (
      lowerFilename.includes('raiffeisen') ||
      lowerFilename.includes('rb_') ||
      lowerFilename.includes('raiff')
    ) {
      return true;
    }

    // Check content markers (dummy check - real implementation will check CSV headers)
    const content = buffer.toString('utf-8').slice(0, 1000).toLowerCase();
    if (content.includes('raiffeisen') || content.includes('raiffeisenbank')) {
      return true;
    }

    return false;
  }

  /**
   * Parses Raiffeisen CSV and returns transactions
   * Dummy implementation returns sample transactions
   */
  async parse(_buffer: Buffer): Promise<ParsedTransaction[]> {
    // Return 10 realistic sample transactions
    return [
      {
        date: '2024-01-15',
        amount: -567.00,
        description: 'TESCO STORES CERNY MOST',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-14',
        amount: -1200.00,
        description: 'SPORTISIMO PALLADIUM',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-13',
        amount: -85.00,
        description: 'MOL BENZINKA PRUHONICE',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-12',
        amount: -320.00,
        description: 'LEKARNA DR. MAX FLORA',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-11',
        amount: -1650.00,
        description: 'IKEA CERNY MOST PRAHA',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-10',
        amount: -450.00,
        description: 'BILLA SUPERMARKET VINOHRADY',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-09',
        amount: 15000.00,
        description: 'VKLAD HOTOVOSTI ATM',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-08',
        amount: -2800.00,
        description: 'VODAFONE MESICNI PLATBA',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-07',
        amount: -189.00,
        description: 'COSTA COFFEE OC METROPOLE',
        bank: 'Raiffeisen',
      },
      {
        date: '2024-01-06',
        amount: -5600.00,
        description: 'NAJEM BYDLENI LEDEN 2024',
        bank: 'Raiffeisen',
      },
    ];
  }
}
