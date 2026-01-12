import type { BankParser, ParsedTransaction } from './types';

/**
 * CSOB Bank CSV Parser (Dummy Implementation)
 *
 * Will be replaced with real implementation when sample files are provided.
 * Currently returns realistic sample transactions for development/testing.
 */
export class CsobParser implements BankParser {
  bankName = 'CSOB';

  /**
   * Detects CSOB files based on filename pattern or content markers
   * Real implementation will check CSV headers and format
   */
  detect(buffer: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns
    if (lowerFilename.includes('csob') || lowerFilename.includes('čsob')) {
      return true;
    }

    // Check content markers (dummy check - real implementation will check CSV headers)
    const content = buffer.toString('utf-8').slice(0, 1000).toLowerCase();
    if (content.includes('csob') || content.includes('čsob')) {
      return true;
    }

    return false;
  }

  /**
   * Parses CSOB CSV and returns transactions
   * Dummy implementation returns sample transactions
   */
  async parse(_buffer: Buffer): Promise<ParsedTransaction[]> {
    // Return 10 realistic sample transactions
    return [
      {
        date: '2024-01-15',
        amount: -1250.00,
        description: 'ALBERT HYPERMARKET PRAHA',
        bank: 'CSOB',
      },
      {
        date: '2024-01-14',
        amount: -89.00,
        description: 'SHELL BENZINA STANICE 123',
        bank: 'CSOB',
      },
      {
        date: '2024-01-13',
        amount: -450.00,
        description: 'LIDL STODULKY PRAHA 5',
        bank: 'CSOB',
      },
      {
        date: '2024-01-12',
        amount: -1899.00,
        description: 'DATART ELEKTRO BUDEJOVICKA',
        bank: 'CSOB',
      },
      {
        date: '2024-01-11',
        amount: -156.50,
        description: 'STARBUCKS COFFEE ANDEL',
        bank: 'CSOB',
      },
      {
        date: '2024-01-10',
        amount: 25000.00,
        description: 'PRIJEM MZDA FIRMA S.R.O.',
        bank: 'CSOB',
      },
      {
        date: '2024-01-09',
        amount: -3500.00,
        description: 'PREVOD NA SPORICI UCET',
        bank: 'CSOB',
      },
      {
        date: '2024-01-08',
        amount: -799.00,
        description: 'CINEMA CITY ZLICIN',
        bank: 'CSOB',
      },
      {
        date: '2024-01-07',
        amount: -2150.00,
        description: 'DR. NOVAK ZUBNI ORDINACE',
        bank: 'CSOB',
      },
      {
        date: '2024-01-06',
        amount: -890.00,
        description: 'CEZ ENERGIE PLATBA',
        bank: 'CSOB',
      },
    ];
  }
}
