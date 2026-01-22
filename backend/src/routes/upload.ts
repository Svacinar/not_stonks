import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadService } from '../services/uploadService';
import { BadRequestError, ValidationError } from '../middleware/errorHandler';

const router = Router();

// Configure multer for memory storage (files stay in memory as buffers)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Max 10 files per upload
  },
  fileFilter: (_req, file, cb) => {
    // Accept common bank statement formats
    const allowedMimeTypes = [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
    ];

    const allowedExtensions = ['.csv', '.txt', '.xlsx', '.xls', '.pdf'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.originalname}. Supported formats: CSV, TXT, XLSX, XLS, PDF`));
    }
  },
});

/**
 * Validates uploaded files for edge cases
 */
function validateFiles(files: Express.Multer.File[]): void {
  const errors: Record<string, string> = {};

  for (const file of files) {
    // Check for empty files
    if (file.size === 0) {
      errors[file.originalname] = 'File is empty';
      continue;
    }

    // Check for files that are too small to be valid (less than 10 bytes)
    if (file.size < 10) {
      errors[file.originalname] = 'File appears to be corrupted or invalid';
      continue;
    }

    // Basic content validation - check for readable content
    const content = file.buffer.toString('utf-8', 0, Math.min(100, file.size));

    // Check if content looks like binary garbage (common in corrupted files)
    const nonPrintableCount = (content.match(/[\x00-\x08\x0E-\x1F]/g) || []).length;
    const printableRatio = 1 - (nonPrintableCount / Math.min(100, file.size));

    // If more than 30% of first 100 bytes are non-printable, likely corrupted
    // (allowing some non-printable for Excel and PDF files which have binary content)
    const isBinaryFormat = file.originalname.toLowerCase().endsWith('.xlsx') ||
                           file.originalname.toLowerCase().endsWith('.xls') ||
                           file.originalname.toLowerCase().endsWith('.pdf');

    if (!isBinaryFormat && printableRatio < 0.7) {
      errors[file.originalname] = 'File appears to be corrupted or in an unsupported format';
    }
  }

  if (Object.keys(errors).length > 0) {
    const firstError = Object.values(errors)[0];
    const fileCount = Object.keys(errors).length;
    const message = fileCount === 1
      ? `${Object.keys(errors)[0]}: ${firstError}`
      : `${fileCount} files have errors. First error: ${firstError}`;

    throw new ValidationError(message, errors);
  }
}

/**
 * POST /api/upload/parse
 * Parse files and return currencies detected (step 1 of two-step import)
 *
 * Request: multipart/form-data with 'files' field
 * Response: { success: true, parsed: 45, currencies: ['CZK', 'EUR'], byBank: {...}, byCurrency: {...}, sessionId: '...' }
 */
router.post(
  '/parse',
  upload.array('files', 10),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new BadRequestError('No files uploaded. Please select at least one file.');
      }

      validateFiles(files);

      const fileUploads = files.map((file) => ({
        buffer: file.buffer,
        filename: file.originalname,
      }));

      const result = await uploadService.parseOnly(fileUploads);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/upload/complete
 * Complete import with conversion rates (step 2 of two-step import)
 *
 * Request: { sessionId: '...', conversionRates: { EUR: 25.12 } }
 * Response: { success: true, imported: 45, duplicates: 5, byBank: {...} }
 */
router.post(
  '/complete',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, conversionRates } = req.body;

      if (!sessionId) {
        throw new BadRequestError('Session ID is required');
      }

      if (!conversionRates || typeof conversionRates !== 'object') {
        throw new BadRequestError('Conversion rates are required');
      }

      const result = await uploadService.completeImport(sessionId, conversionRates);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/upload
 * Upload one or more bank statement files (original one-step flow)
 * For CZK-only files this works directly; for foreign currencies use /parse + /complete
 *
 * Request: multipart/form-data with 'files' field
 * Response: { success: true, imported: 45, duplicates: 5, byBank: { CSOB: 20, Revolut: 25 } }
 */
router.post(
  '/',
  upload.array('files', 10),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new BadRequestError('No files uploaded. Please select at least one file.');
      }

      // Validate files for edge cases (empty, corrupted, etc.)
      validateFiles(files);

      // Convert multer files to our format
      const fileUploads = files.map((file) => ({
        buffer: file.buffer,
        filename: file.originalname,
      }));

      // Process the uploads
      const result = await uploadService.processUploads(fileUploads);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Handle multer errors
router.use((error: Error, _req: Request, _res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      next(new BadRequestError('File too large. Maximum file size is 5MB.'));
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      next(new BadRequestError('Too many files. Maximum is 10 files per upload.'));
      return;
    }
    next(new BadRequestError(error.message));
    return;
  }
  // Pass file type validation errors from multer fileFilter
  if (error.message?.includes('Unsupported file type')) {
    next(new BadRequestError(error.message));
    return;
  }
  next(error);
});

export default router;
