import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadService } from '../services/uploadService';

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
    ];

    const allowedExtensions = ['.csv', '.txt', '.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.originalname}. Supported formats: CSV, TXT, XLSX, XLS`));
    }
  },
});

/**
 * POST /api/upload
 * Upload one or more bank statement files
 *
 * Request: multipart/form-data with 'files' field
 * Response: { success: true, imported: 45, duplicates: 5, byBank: { CSOB: 20, Revolut: 25 } }
 */
router.post(
  '/',
  upload.array('files', 10),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded. Please select at least one file.',
        });
        return;
      }

      // Convert multer files to our format
      const fileUploads = files.map((file) => ({
        buffer: file.buffer,
        filename: file.originalname,
      }));

      // Process the uploads
      const result = await uploadService.processUploads(fileUploads);

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

// Handle multer errors
router.use((error: Error, _req: Request, res: Response, next: Function) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'File too large. Maximum file size is 5MB.',
      });
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 10 files per upload.',
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }
  next(error);
});

export default router;
