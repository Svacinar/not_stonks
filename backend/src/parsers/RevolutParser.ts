import type { BankParser, ParsedTransaction } from './types';

/**
 * Revolut CSV/Excel Parser (Dummy Implementation)
 *
 * Will be replaced with real implementation when sample files are provided.
 * Currently returns realistic sample transactions for development/testing.
 * Note: Revolut exports include category information.
 */
export class RevolutParser implements BankParser {
  bankName = 'Revolut';

  /**
   * Detects Revolut files based on filename pattern or content markers
   * Real implementation will check CSV/Excel headers and format
   */
  detect(buffer: Buffer, filename: string): boolean {
    const lowerFilename = filename.toLowerCase();

    // Check filename patterns
    if (lowerFilename.includes('revolut')) {
      return true;
    }

    // Check for Revolut-specific file extensions/patterns
    if (lowerFilename.match(/revolut.*\.(csv|xlsx)$/)) {
      return true;
    }

    // Check content markers (dummy check - real implementation will check CSV headers)
    const content = buffer.toString('utf-8').slice(0, 1000).toLowerCase();
    if (content.includes('revolut') || content.includes('completed date')) {
      return true;
    }

    return false;
  }

  /**
   * Parses Revolut CSV/Excel and returns transactions
   * Dummy implementation returns sample transactions with original categories
   */
  async parse(_buffer: Buffer): Promise<ParsedTransaction[]> {
    // Return 10 realistic sample transactions with Revolut categories
    return [
      {
        date: '2024-01-15',
        amount: -23.50,
        description: 'UBER TRIP AMSTERDAM',
        bank: 'Revolut',
        originalCategory: 'Transport',
      },
      {
        date: '2024-01-14',
        amount: -156.00,
        description: 'BOOKING.COM HOTEL WIEN',
        bank: 'Revolut',
        originalCategory: 'Travel',
      },
      {
        date: '2024-01-13',
        amount: -45.90,
        description: 'NETFLIX.COM SUBSCRIPTION',
        bank: 'Revolut',
        originalCategory: 'Entertainment',
      },
      {
        date: '2024-01-12',
        amount: -89.00,
        description: 'SPOTIFY PREMIUM',
        bank: 'Revolut',
        originalCategory: 'Entertainment',
      },
      {
        date: '2024-01-11',
        amount: -234.50,
        description: 'AMAZON.DE MARKETPLACE',
        bank: 'Revolut',
        originalCategory: 'Shopping',
      },
      {
        date: '2024-01-10',
        amount: 500.00,
        description: 'TOP UP FROM BANK ACCOUNT',
        bank: 'Revolut',
        originalCategory: 'Transfer',
      },
      {
        date: '2024-01-09',
        amount: -67.80,
        description: 'BOLT FOOD DELIVERY',
        bank: 'Revolut',
        originalCategory: 'Restaurants',
      },
      {
        date: '2024-01-08',
        amount: -12.99,
        description: 'APPLE.COM/BILL ITUNES',
        bank: 'Revolut',
        originalCategory: 'Entertainment',
      },
      {
        date: '2024-01-07',
        amount: -340.00,
        description: 'AIRBNB ACCOMMODATION',
        bank: 'Revolut',
        originalCategory: 'Travel',
      },
      {
        date: '2024-01-06',
        amount: -28.50,
        description: 'WOLT DELIVERY SERVICE',
        bank: 'Revolut',
        originalCategory: 'Restaurants',
      },
    ];
  }
}
