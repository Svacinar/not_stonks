import type { BankParser, ParsedTransaction } from './types';
import { CsobParser } from './CsobParser';
import { RaiffeisenParser } from './RaiffeisenParser';
import { RevolutParser } from './RevolutParser';

/**
 * ParserService - Auto-detects bank type and parses transactions
 *
 * This service manages all bank parsers and provides a unified interface
 * for parsing bank statements. It auto-detects the bank based on file
 * content and filename patterns.
 */
export class ParserService {
  private parsers: BankParser[];

  constructor() {
    // Register all available parsers
    this.parsers = [
      new CsobParser(),
      new RaiffeisenParser(),
      new RevolutParser(),
    ];
  }

  /**
   * Detects which bank the file belongs to
   * @param buffer File content as Buffer
   * @param filename Original filename
   * @returns The detected bank parser or null if no match
   */
  detectBank(buffer: Buffer, filename: string): BankParser | null {
    for (const parser of this.parsers) {
      if (parser.detect(buffer, filename)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Parses a bank statement file
   * @param buffer File content as Buffer
   * @param filename Original filename (used for bank detection)
   * @returns Parsed transactions
   * @throws Error if bank type cannot be detected
   */
  async parse(buffer: Buffer, filename: string): Promise<ParsedTransaction[]> {
    const parser = this.detectBank(buffer, filename);

    if (!parser) {
      throw new Error(
        `Unable to detect bank type for file: ${filename}. ` +
        `Supported banks: ${this.getSupportedBanks().join(', ')}`
      );
    }

    return parser.parse(buffer);
  }

  /**
   * Gets the list of supported bank names
   */
  getSupportedBanks(): string[] {
    return this.parsers.map((p) => p.bankName);
  }

  /**
   * Registers a custom parser (useful for testing or extending)
   */
  registerParser(parser: BankParser): void {
    this.parsers.push(parser);
  }

  /**
   * Gets all registered parsers (useful for testing)
   */
  getParsers(): BankParser[] {
    return [...this.parsers];
  }
}

// Export a singleton instance for convenience
export const parserService = new ParserService();
