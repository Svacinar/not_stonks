import { describe, it, expect, beforeEach } from 'vitest';
import {
  CsobParser,
  RaiffeisenParser,
  RevolutParser,
  ParserService,
  parserService,
} from '../src/parsers';
import type { BankParser, ParsedTransaction } from '../src/parsers';

describe('BankParser Interface Contract', () => {
  const parsers: BankParser[] = [
    new CsobParser(),
    new RaiffeisenParser(),
    new RevolutParser(),
  ];

  it.each(parsers.map((p) => [p.bankName, p]))(
    '%s parser has required properties',
    (_name, parser) => {
      expect(parser.bankName).toBeDefined();
      expect(typeof parser.bankName).toBe('string');
      expect(parser.detect).toBeDefined();
      expect(typeof parser.detect).toBe('function');
      expect(parser.parse).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    }
  );

  it.each(parsers.map((p) => [p.bankName, p]))(
    '%s parser returns correct transaction structure',
    async (_name, parser) => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);

      transactions.forEach((tx: ParsedTransaction) => {
        expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof tx.amount).toBe('number');
        expect(typeof tx.description).toBe('string');
        expect(tx.description.length).toBeGreaterThan(0);
        expect(['CSOB', 'Raiffeisen', 'Revolut']).toContain(tx.bank);
      });
    }
  );
});

describe('CsobParser', () => {
  let parser: CsobParser;

  beforeEach(() => {
    parser = new CsobParser();
  });

  it('has correct bank name', () => {
    expect(parser.bankName).toBe('CSOB');
  });

  describe('detect', () => {
    it('detects files with csob in filename', () => {
      const buffer = Buffer.from('some content');
      expect(parser.detect(buffer, 'csob_export_2024.csv')).toBe(true);
      expect(parser.detect(buffer, 'CSOB-statement.csv')).toBe(true);
      expect(parser.detect(buffer, 'my_CSOB_transactions.csv')).toBe(true);
    });

    it('detects files with čsob (Czech) in filename', () => {
      const buffer = Buffer.from('some content');
      expect(parser.detect(buffer, 'čsob_výpis.csv')).toBe(true);
    });

    it('detects files with csob in content', () => {
      const buffer = Buffer.from('Header row\nCSOB Bank Statement\nData...');
      expect(parser.detect(buffer, 'unknown.csv')).toBe(true);
    });

    it('does not detect unrelated files', () => {
      const buffer = Buffer.from('Header row\nSome other bank\nData...');
      expect(parser.detect(buffer, 'raiffeisen.csv')).toBe(false);
      expect(parser.detect(buffer, 'revolut.csv')).toBe(false);
    });
  });

  describe('parse', () => {
    it('returns 10 sample transactions', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      expect(transactions).toHaveLength(10);
    });

    it('all transactions have CSOB bank', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.bank).toBe('CSOB');
      });
    });

    it('includes realistic Czech merchant descriptions', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);
      const descriptions = transactions.map((tx) => tx.description);

      // Should include typical Czech merchants
      expect(descriptions.some((d) => d.includes('ALBERT'))).toBe(true);
      expect(descriptions.some((d) => d.includes('LIDL'))).toBe(true);
    });

    it('has mix of positive and negative amounts', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      const positiveAmounts = transactions.filter((tx) => tx.amount > 0);
      const negativeAmounts = transactions.filter((tx) => tx.amount < 0);

      expect(positiveAmounts.length).toBeGreaterThan(0);
      expect(negativeAmounts.length).toBeGreaterThan(0);
    });
  });
});

describe('RaiffeisenParser', () => {
  let parser: RaiffeisenParser;

  beforeEach(() => {
    parser = new RaiffeisenParser();
  });

  it('has correct bank name', () => {
    expect(parser.bankName).toBe('Raiffeisen');
  });

  describe('detect', () => {
    it('detects files with raiffeisen in filename', () => {
      const buffer = Buffer.from('some content');
      expect(parser.detect(buffer, 'raiffeisen_export.csv')).toBe(true);
      expect(parser.detect(buffer, 'Raiffeisen-statement.csv')).toBe(true);
      expect(parser.detect(buffer, 'rb_transactions.csv')).toBe(true);
      expect(parser.detect(buffer, 'raiff_2024.csv')).toBe(true);
    });

    it('detects files with raiffeisen in content', () => {
      const buffer = Buffer.from('Header\nRaiffeisenbank a.s.\nData...');
      expect(parser.detect(buffer, 'unknown.csv')).toBe(true);
    });

    it('does not detect unrelated files', () => {
      const buffer = Buffer.from('Header row\nSome other bank\nData...');
      expect(parser.detect(buffer, 'csob.csv')).toBe(false);
      expect(parser.detect(buffer, 'revolut.csv')).toBe(false);
    });
  });

  describe('parse', () => {
    it('returns 10 sample transactions', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      expect(transactions).toHaveLength(10);
    });

    it('all transactions have Raiffeisen bank', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.bank).toBe('Raiffeisen');
      });
    });

    it('includes realistic Czech merchant descriptions', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);
      const descriptions = transactions.map((tx) => tx.description);

      expect(descriptions.some((d) => d.includes('TESCO'))).toBe(true);
      expect(descriptions.some((d) => d.includes('IKEA'))).toBe(true);
    });
  });
});

describe('RevolutParser', () => {
  let parser: RevolutParser;

  beforeEach(() => {
    parser = new RevolutParser();
  });

  it('has correct bank name', () => {
    expect(parser.bankName).toBe('Revolut');
  });

  describe('detect', () => {
    it('detects files with revolut in filename', () => {
      const buffer = Buffer.from('some content');
      expect(parser.detect(buffer, 'revolut_export.csv')).toBe(true);
      expect(parser.detect(buffer, 'Revolut-transactions.xlsx')).toBe(true);
    });

    it('detects files with revolut in content', () => {
      const buffer = Buffer.from('Completed Date,Description,Paid Out\nRevolut transaction data...');
      expect(parser.detect(buffer, 'unknown.csv')).toBe(true);
    });

    it('does not detect unrelated files', () => {
      const buffer = Buffer.from('Header row\nSome other bank\nData...');
      expect(parser.detect(buffer, 'csob.csv')).toBe(false);
      expect(parser.detect(buffer, 'raiffeisen.csv')).toBe(false);
    });
  });

  describe('parse', () => {
    it('returns 10 sample transactions', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      expect(transactions).toHaveLength(10);
    });

    it('all transactions have Revolut bank', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.bank).toBe('Revolut');
      });
    });

    it('includes originalCategory for Revolut transactions', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);

      // Revolut transactions should have original categories
      const withCategory = transactions.filter((tx) => tx.originalCategory);
      expect(withCategory.length).toBeGreaterThan(0);
    });

    it('includes typical online/international merchants', async () => {
      const buffer = Buffer.from('dummy content');
      const transactions = await parser.parse(buffer);
      const descriptions = transactions.map((tx) => tx.description);

      expect(descriptions.some((d) => d.includes('UBER') || d.includes('NETFLIX'))).toBe(true);
    });
  });
});

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(() => {
    service = new ParserService();
  });

  describe('getSupportedBanks', () => {
    it('returns all supported bank names', () => {
      const banks = service.getSupportedBanks();

      expect(banks).toContain('CSOB');
      expect(banks).toContain('Raiffeisen');
      expect(banks).toContain('Revolut');
      expect(banks).toHaveLength(3);
    });
  });

  describe('detectBank', () => {
    it('detects CSOB bank', () => {
      const buffer = Buffer.from('content');
      const parser = service.detectBank(buffer, 'csob_export.csv');

      expect(parser).not.toBeNull();
      expect(parser?.bankName).toBe('CSOB');
    });

    it('detects Raiffeisen bank', () => {
      const buffer = Buffer.from('content');
      const parser = service.detectBank(buffer, 'raiffeisen_export.csv');

      expect(parser).not.toBeNull();
      expect(parser?.bankName).toBe('Raiffeisen');
    });

    it('detects Revolut bank', () => {
      const buffer = Buffer.from('content');
      const parser = service.detectBank(buffer, 'revolut_export.csv');

      expect(parser).not.toBeNull();
      expect(parser?.bankName).toBe('Revolut');
    });

    it('returns null for unknown bank', () => {
      const buffer = Buffer.from('random content');
      const parser = service.detectBank(buffer, 'unknown_file.csv');

      expect(parser).toBeNull();
    });
  });

  describe('parse', () => {
    it('parses CSOB file', async () => {
      const buffer = Buffer.from('content');
      const transactions = await service.parse(buffer, 'csob_export.csv');

      expect(transactions).toHaveLength(10);
      expect(transactions[0].bank).toBe('CSOB');
    });

    it('parses Raiffeisen file', async () => {
      const buffer = Buffer.from('content');
      const transactions = await service.parse(buffer, 'raiffeisen_export.csv');

      expect(transactions).toHaveLength(10);
      expect(transactions[0].bank).toBe('Raiffeisen');
    });

    it('parses Revolut file', async () => {
      const buffer = Buffer.from('content');
      const transactions = await service.parse(buffer, 'revolut_export.csv');

      expect(transactions).toHaveLength(10);
      expect(transactions[0].bank).toBe('Revolut');
    });

    it('throws error for unknown bank', async () => {
      const buffer = Buffer.from('random content');

      await expect(service.parse(buffer, 'unknown_file.csv')).rejects.toThrow(
        'Unable to detect bank type'
      );
    });

    it('error message includes supported banks', async () => {
      const buffer = Buffer.from('random content');

      await expect(service.parse(buffer, 'unknown_file.csv')).rejects.toThrow(
        /CSOB.*Raiffeisen.*Revolut/
      );
    });
  });

  describe('registerParser', () => {
    it('allows registering custom parser', async () => {
      const customParser: BankParser = {
        bankName: 'CustomBank',
        detect: (_buffer, filename) => filename.includes('custom'),
        parse: async () => [
          { date: '2024-01-01', amount: -100, description: 'Custom', bank: 'CSOB' },
        ],
      };

      service.registerParser(customParser);
      const banks = service.getSupportedBanks();

      expect(banks).toContain('CustomBank');
    });
  });

  describe('getParsers', () => {
    it('returns copy of parsers array', () => {
      const parsers = service.getParsers();

      expect(parsers).toHaveLength(3);
      // Modifying returned array should not affect service
      parsers.pop();
      expect(service.getParsers()).toHaveLength(3);
    });
  });
});

describe('Singleton parserService', () => {
  it('is exported and ready to use', () => {
    expect(parserService).toBeDefined();
    expect(parserService.getSupportedBanks()).toHaveLength(3);
  });

  it('can parse files directly', async () => {
    const buffer = Buffer.from('content');
    const transactions = await parserService.parse(buffer, 'revolut_export.csv');

    expect(transactions).toHaveLength(10);
  });
});
