import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiRequestError } from '../api/client';
import { UploadResponse, BankName } from '../../../shared/types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { GradientText } from '@/components/ui/gradient-text';

interface SelectedFile {
  file: File;
  id: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const acceptedExtensions = '.csv,.txt,.xlsx,.xls';
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const maxFiles = 10;

  const generateFileId = () => Math.random().toString(36).substring(2, 9);

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const validExtensions = ['.csv', '.txt', '.xlsx', '.xls'];

    if (!validExtensions.includes(ext)) {
      return `Invalid file type: ${file.name}. Supported formats: CSV, TXT, XLSX, XLS`;
    }

    if (file.size > maxFileSize) {
      return `File too large: ${file.name}. Maximum size is 5MB`;
    }

    return null;
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Validate total file count
    if (selectedFiles.length + fileArray.length > maxFiles) {
      setErrorMessage(`Too many files. Maximum is ${maxFiles} files.`);
      return;
    }

    const newFiles: SelectedFile[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        // Check for duplicates by name
        const isDuplicate = selectedFiles.some((sf) => sf.file.name === file.name);
        if (!isDuplicate) {
          newFiles.push({ file, id: generateFileId() });
        }
      }
    }

    if (errors.length > 0) {
      setErrorMessage(errors[0]);
    } else {
      setErrorMessage('');
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  }, [selectedFiles]);

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
    setErrorMessage('');
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setErrorMessage('');
    setUploadState('idle');
    setUploadResult(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploadState('uploading');
    setErrorMessage('');

    try {
      const files = selectedFiles.map((sf) => sf.file);
      const result = await api.upload<UploadResponse>('/api/upload', files);

      setUploadResult(result);
      setUploadState('success');
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'An unexpected error occurred during upload';
      setErrorMessage(message);
      setUploadState('error');
    }
  };

  const handleGoToTransactions = () => {
    navigate('/transactions');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getBankSummary = (byBank: Record<BankName, number>): string => {
    const banks = Object.entries(byBank)
      .filter(([, count]) => count > 0)
      .map(([bank, count]) => `${bank}: ${count}`);
    return banks.join(', ');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        <GradientText>Upload Bank Statements</GradientText>
      </h1>

      {/* Success State */}
      {uploadState === 'success' && uploadResult && (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="h-5 w-5" />
          <AlertTitle className="text-base">Upload Successful</AlertTitle>
          <AlertDescription>
            <p className="font-medium">
              Imported {uploadResult.imported} transactions
              {Object.keys(uploadResult.byBank).length > 0 && (
                <span> from {getBankSummary(uploadResult.byBank)}</span>
              )}
            </p>
            {uploadResult.duplicates > 0 && (
              <p className="mt-1">
                {uploadResult.duplicates} duplicate{uploadResult.duplicates !== 1 ? 's' : ''} skipped
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <Button
                onClick={handleGoToTransactions}
                variant="success"
              >
                View Transactions
              </Button>
              <Button
                variant="outline"
                onClick={clearAllFiles}
              >
                Upload More
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {errorMessage && (
        <ErrorMessage
          message={errorMessage}
          className="mb-4"
          onRetry={uploadState === 'error' ? handleUpload : undefined}
        />
      )}

      {/* Drag and Drop Zone */}
      {uploadState !== 'success' && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              uploadState === 'uploading' && 'pointer-events-none opacity-60'
            )}
          >
            <label htmlFor="file-upload" className="sr-only">
              Choose bank statement files to upload
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="file-upload"
              accept={acceptedExtensions}
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              data-testid="file-input"
            />

            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <div className="mt-4">
              <p className="text-lg text-muted-foreground">
                Drag and drop your bank statements here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">or</p>
              <Button
                onClick={handleBrowseClick}
                disabled={uploadState === 'uploading'}
                className="mt-2"
              >
                Browse Files
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Supported formats: CSV, TXT, XLSX, XLS (max 5MB each, up to 10 files)
            </p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-foreground">
                  Selected Files ({selectedFiles.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={uploadState === 'uploading'}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>

              <Card>
                <ul className="divide-y divide-border">
                  {selectedFiles.map((sf) => (
                    <li
                      key={sf.id}
                      className="flex items-center justify-between py-3 px-4"
                    >
                      <div className="flex items-center min-w-0">
                        <svg
                          className="h-5 w-5 text-muted-foreground flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="ml-2 truncate text-sm text-foreground">
                          {sf.file.name}
                        </span>
                        <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                          {formatFileSize(sf.file.size)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(sf.id)}
                        disabled={uploadState === 'uploading'}
                        className="ml-4 h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${sf.file.name}`}
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Upload Button */}
              <div className="mt-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploadState === 'uploading' || selectedFiles.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {uploadState === 'uploading' ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
