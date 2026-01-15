import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  CsobParser,
  RaiffeisenParser,
  RevolutParser,
  ParserService,
  parserService,
} from '../src/parsers';
import type { BankParser, ParsedTransaction } from '../src/parsers';

// Path to test statement files (use generic names - actual files are gitignored)
const TEST_REVOLUT_CSV = join(__dirname, '../test-statements/revolut-statement.csv');
const TEST_CSOB_PDF = join(__dirname, '../test-statements/csob-statement.pdf');
const TEST_RAIFFEISEN_PDF = join(__dirname, '../test-statements/raiffeisen-statement.pdf');

describe('BankParser Interface Contract', () => {
  const allParsers: BankParser[] = [
    new CsobParser(),
    new RaiffeisenParser(),
    new RevolutParser(),
  ];

  it.each(allParsers.map((p) => [p.bankName, p]))(
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

    it('detects CSOB PDF filename pattern', () => {
      const buffer = Buffer.from('%PDF-1.4 some pdf content');
      expect(parser.detect(buffer, '123456789_20251231_12_MCZB.pdf')).toBe(true);
    });

    it.skipIf(!existsSync(TEST_CSOB_PDF))('detects real CSOB PDF file', () => {
      const buffer = readFileSync(TEST_CSOB_PDF);
      expect(parser.detect(buffer, 'csob-statement.pdf')).toBe(true);
    });

    it('does not detect unrelated files', () => {
      const buffer = Buffer.from('Header row\nSome other bank\nData...');
      expect(parser.detect(buffer, 'raiffeisen.csv')).toBe(false);
      expect(parser.detect(buffer, 'revolut.csv')).toBe(false);
    });
  });

  describe('parse', () => {
    it('throws error for non-PDF content', async () => {
      const buffer = Buffer.from('dummy content');
      await expect(parser.parse(buffer)).rejects.toThrow('CSOB parser currently only supports PDF format');
    });

    it.skipIf(!existsSync(TEST_CSOB_PDF))('parses real CSOB PDF file', async () => {
      const buffer = readFileSync(TEST_CSOB_PDF);
      const transactions = await parser.parse(buffer);

      // The test file has 26 transactions
      expect(transactions.length).toBe(26);
    });

    it.skipIf(!existsSync(TEST_CSOB_PDF))('all transactions have CSOB bank', async () => {
      const buffer = readFileSync(TEST_CSOB_PDF);
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.bank).toBe('CSOB');
      });
    });

    it.skipIf(!existsSync(TEST_CSOB_PDF))('has correct date format', async () => {
      const buffer = readFileSync(TEST_CSOB_PDF);
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it.skipIf(!existsSync(TEST_CSOB_PDF))('has mix of positive and negative amounts', async () => {
      const buffer = readFileSync(TEST_CSOB_PDF);
      const transactions = await parser.parse(buffer);

      const positiveAmounts = transactions.filter((tx) => tx.amount > 0);
      const negativeAmounts = transactions.filter((tx) => tx.amount < 0);

      expect(positiveAmounts.length).toBeGreaterThan(0);
      expect(negativeAmounts.length).toBeGreaterThan(0);
    });

    it.skipIf(!existsSync(TEST_CSOB_PDF))('parses amounts correctly', async () => {
      const buffer = readFileSync(TEST_CSOB_PDF);
      const transactions = await parser.parse(buffer);

      // Check some known transactions from the PDF
      const tchibo = transactions.find((tx) => tx.description.includes('tchibo'));
      expect(tchibo).toBeDefined();
      expect(tchibo?.amount).toBe(-1462);

      const income = transactions.find((tx) => tx.amount === 33500);
      expect(income).toBeDefined();
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
      const buffer = Buffer.from('%PDF-1.4 some content');
      expect(parser.detect(buffer, 'raiffeisen_export.pdf')).toBe(true);
      expect(parser.detect(buffer, 'Raiffeisen-statement.pdf')).toBe(true);
      expect(parser.detect(buffer, 'rb_transactions.pdf')).toBe(true);
      expect(parser.detect(buffer, 'raiff_2024.pdf')).toBe(true);
    });

    it('detects Raiffeisen PDF filename pattern', () => {
      const buffer = Buffer.from('%PDF-1.4 some pdf content');
      expect(parser.detect(buffer, 'Statement_123456789_CZK_2025_012.pdf')).toBe(true);
      expect(parser.detect(buffer, 'Statement_987654321_EUR_2024_01.pdf')).toBe(true);
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('detects real Raiffeisen PDF file', () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      expect(parser.detect(buffer, 'raiffeisen-statement.pdf')).toBe(true);
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
    it('throws error for non-PDF content', async () => {
      const buffer = Buffer.from('dummy content');
      await expect(parser.parse(buffer)).rejects.toThrow('Raiffeisen parser currently only supports PDF format');
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('parses real Raiffeisen PDF file', async () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      const transactions = await parser.parse(buffer);

      // The test file has 16 transactions
      expect(transactions.length).toBe(16);
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('all transactions have Raiffeisen bank', async () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.bank).toBe('Raiffeisen');
      });
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('has correct date format', async () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('has mix of positive and negative amounts', async () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      const transactions = await parser.parse(buffer);

      const positiveAmounts = transactions.filter((tx) => tx.amount > 0);
      const negativeAmounts = transactions.filter((tx) => tx.amount < 0);

      expect(positiveAmounts.length).toBeGreaterThan(0);
      expect(negativeAmounts.length).toBeGreaterThan(0);
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('parses amounts correctly', async () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      const transactions = await parser.parse(buffer);

      // Check some known transactions from the PDF
      const tmobile = transactions.find((tx) => tx.description.includes('T-MOBILE'));
      expect(tmobile).toBeDefined();
      expect(tmobile?.amount).toBe(-495);

      const cookielab = transactions.find((tx) => tx.description.includes('COOKIELAB'));
      expect(cookielab).toBeDefined();
      expect(cookielab?.amount).toBe(109825);
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('totals match PDF header values', async () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      const transactions = await parser.parse(buffer);

      const totalIncome = transactions
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalExpenses = transactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      // Values from the PDF header
      expect(totalIncome).toBe(111825);
      expect(totalExpenses).toBeCloseTo(114850.52, 2);
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

    it('detects account-statement filename pattern', () => {
      const buffer = Buffer.from('some content');
      expect(parser.detect(buffer, 'account-statement_2025-12-01_2025-12-31_es-es_abc123.csv')).toBe(true);
      expect(parser.detect(buffer, 'account-statement_2024-01-01_2024-01-31_en-gb_xyz789.csv')).toBe(true);
    });

    it('detects files with English headers', () => {
      const buffer = Buffer.from('Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\nCard payment,...');
      expect(parser.detect(buffer, 'unknown.csv')).toBe(true);
    });

    it('detects files with Spanish headers', () => {
      const buffer = Buffer.from('Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo\nPago con tarjeta,...');
      expect(parser.detect(buffer, 'unknown.csv')).toBe(true);
    });

    it('does not detect unrelated files', () => {
      const buffer = Buffer.from('Header row\nSome other bank\nData...');
      expect(parser.detect(buffer, 'csob.csv')).toBe(false);
      expect(parser.detect(buffer, 'raiffeisen.csv')).toBe(false);
    });
  });

  describe('parse with synthetic data', () => {
    it('parses Spanish CSV format', async () => {
      const csvContent = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Pago con tarjeta,Actual,2025-12-06 00:31:43,2025-12-06 14:54:21,OpenAI,-505.05,0.00,CZK,COMPLETADO,7593.34
Recargas,Actual,2025-12-11 07:14:19,2025-12-11 07:14:20,Apple Pay Top-up,10000.00,0.00,CZK,COMPLETADO,17593.34`;

      const buffer = Buffer.from(csvContent);
      const transactions = await parser.parse(buffer);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].date).toBe('2025-12-06');
      expect(transactions[0].amount).toBe(-505.05);
      expect(transactions[0].description).toBe('OpenAI');
      expect(transactions[0].bank).toBe('Revolut');
      expect(transactions[0].originalCategory).toBe('Pago con tarjeta');

      expect(transactions[1].date).toBe('2025-12-11');
      expect(transactions[1].amount).toBe(10000);
      expect(transactions[1].description).toBe('Apple Pay Top-up');
      expect(transactions[1].originalCategory).toBe('Recargas');
    });

    it('parses English CSV format', async () => {
      const csvContent = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
Card payment,Current,2025-12-06 00:31:43,2025-12-06 14:54:21,Netflix,-15.99,0.00,EUR,COMPLETED,500.00
Top-up,Current,2025-12-11 07:14:19,2025-12-11 07:14:20,Bank Transfer,1000.00,0.00,EUR,COMPLETED,1500.00`;

      const buffer = Buffer.from(csvContent);
      const transactions = await parser.parse(buffer);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].date).toBe('2025-12-06');
      expect(transactions[0].amount).toBe(-15.99);
      expect(transactions[0].description).toBe('Netflix');
      expect(transactions[0].originalCategory).toBe('Card payment');
    });

    it('handles fees as separate transactions', async () => {
      const csvContent = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Cobro,Actual,2025-12-12 03:54:15,2025-12-12 03:54:15,Tarifa del plan Metal,0.00,349.99,CZK,COMPLETADO,17243.35`;

      const buffer = Buffer.from(csvContent);
      const transactions = await parser.parse(buffer);

      // Should have 1 transaction for the fee (amount is 0, so only fee transaction)
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(-349.99);
      expect(transactions[0].description).toBe('Fee: Tarifa del plan Metal');
      expect(transactions[0].originalCategory).toBe('Fee');
    });

    it('extracts date correctly from datetime', async () => {
      const csvContent = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Pago con tarjeta,Actual,2025-01-15 23:59:59,2025-01-16 01:00:00,Test Payment,-100.00,0.00,CZK,COMPLETADO,1000.00`;

      const buffer = Buffer.from(csvContent);
      const transactions = await parser.parse(buffer);

      expect(transactions[0].date).toBe('2025-01-15');
    });

    it('all transactions have Revolut bank', async () => {
      const csvContent = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Pago con tarjeta,Actual,2025-12-06 00:31:43,2025-12-06 14:54:21,Merchant 1,-100.00,0.00,CZK,COMPLETADO,1000.00
Pago con tarjeta,Actual,2025-12-07 00:31:43,2025-12-07 14:54:21,Merchant 2,-50.00,0.00,CZK,COMPLETADO,950.00`;

      const buffer = Buffer.from(csvContent);
      const transactions = await parser.parse(buffer);

      transactions.forEach((tx) => {
        expect(tx.bank).toBe('Revolut');
      });
    });

    it('throws error for unsupported CSV format', async () => {
      const csvContent = `Unknown,Headers,Here
data1,data2,data3`;

      const buffer = Buffer.from(csvContent);
      await expect(parser.parse(buffer)).rejects.toThrow('Unable to detect Revolut CSV format');
    });

    it('returns empty array for empty file', async () => {
      const buffer = Buffer.from('');
      const transactions = await parser.parse(buffer);
      expect(transactions).toHaveLength(0);
    });
  });

  describe('parse with real test file', () => {
    it.skipIf(!existsSync(TEST_REVOLUT_CSV))('parses real Revolut statement file', async () => {
      const buffer = readFileSync(TEST_REVOLUT_CSV);
      const transactions = await parser.parse(buffer);

      // The test file has ~40 transactions
      expect(transactions.length).toBeGreaterThan(30);

      // All transactions should have valid structure
      transactions.forEach((tx) => {
        expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof tx.amount).toBe('number');
        expect(tx.amount).not.toBe(0);
        expect(typeof tx.description).toBe('string');
        expect(tx.description.length).toBeGreaterThan(0);
        expect(tx.bank).toBe('Revolut');
        expect(tx.originalCategory).toBeDefined();
      });
    });

    it.skipIf(!existsSync(TEST_REVOLUT_CSV))('correctly parses known transactions from real file', async () => {
      const buffer = readFileSync(TEST_REVOLUT_CSV);
      const transactions = await parser.parse(buffer);

      // First transaction should be OpenAI
      const openai = transactions.find((tx) => tx.description === 'OpenAI');
      expect(openai).toBeDefined();
      expect(openai?.amount).toBe(-505.05);
      expect(openai?.originalCategory).toBe('Pago con tarjeta');

      // Should have Apple Pay top-ups (positive amounts)
      const topups = transactions.filter((tx) => tx.amount > 0);
      expect(topups.length).toBeGreaterThan(0);

      // Should have various merchants
      const descriptions = transactions.map((tx) => tx.description);
      expect(descriptions.some((d) => d.includes('Alza'))).toBe(true);
      expect(descriptions.some((d) => d.includes('Lidl'))).toBe(true);
    });

    it.skipIf(!existsSync(TEST_REVOLUT_CSV))('detects real Revolut file', () => {
      const buffer = readFileSync(TEST_REVOLUT_CSV);
      expect(parser.detect(buffer, 'revolut-statement.csv')).toBe(true);
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
    it.skipIf(!existsSync(TEST_CSOB_PDF))('parses CSOB PDF file', async () => {
      const buffer = readFileSync(TEST_CSOB_PDF);
      const transactions = await service.parse(buffer, 'csob-statement.pdf');

      expect(transactions.length).toBe(26);
      expect(transactions[0].bank).toBe('CSOB');
    });

    it.skipIf(!existsSync(TEST_RAIFFEISEN_PDF))('parses Raiffeisen PDF file', async () => {
      const buffer = readFileSync(TEST_RAIFFEISEN_PDF);
      const transactions = await service.parse(buffer, 'raiffeisen-statement.pdf');

      expect(transactions.length).toBe(16);
      expect(transactions[0].bank).toBe('Raiffeisen');
    });

    it('parses Revolut file with valid CSV', async () => {
      const csvContent = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Pago con tarjeta,Actual,2025-12-06 00:31:43,2025-12-06 14:54:21,Test Payment,-100.00,0.00,CZK,COMPLETADO,1000.00`;
      const buffer = Buffer.from(csvContent);
      const transactions = await service.parse(buffer, 'revolut_export.csv');

      expect(transactions.length).toBeGreaterThan(0);
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
    // Use valid CSV content for Revolut parser
    const csvContent = `Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo
Pago con tarjeta,Actual,2025-12-06 00:31:43,2025-12-06 14:54:21,Test Payment,-100.00,0.00,CZK,COMPLETADO,1000.00`;
    const buffer = Buffer.from(csvContent);
    const transactions = await parserService.parse(buffer, 'revolut_export.csv');

    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0].bank).toBe('Revolut');
  });
});
