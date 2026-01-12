import type { ParsedTransaction } from 'shared/types';

export type { ParsedTransaction };

export interface BankParser {
  /**
   * Detects if the given buffer/filename matches this parser's bank format
   */
  detect(buffer: Buffer, filename: string): boolean;

  /**
   * Parses the buffer and returns an array of transactions
   */
  parse(buffer: Buffer): Promise<ParsedTransaction[]>;

  /**
   * The name of the bank this parser handles
   */
  bankName: string;
}
