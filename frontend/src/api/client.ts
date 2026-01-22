/**
 * API client utility for backend calls.
 * Handles errors uniformly and provides typed responses.
 * Includes retry mechanism and graceful degradation.
 */

export interface ApiError {
  message: string;
  status: number;
}

/**
 * Standard error response format from the backend
 * Format: { success: false, error: { code, message, details? } }
 */
export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export class ApiRequestError extends Error {
  status: number;
  isNetworkError: boolean;
  code?: string;
  details?: Record<string, string>;

  constructor(message: string, status: number, isNetworkError = false, code?: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.code = code;
    this.details = details;
  }
}

/**
 * Checks if error response is in standard format
 */
function isStandardErrorResponse(data: unknown): data is StandardErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    data.success === false &&
    'error' in data &&
    typeof (data as StandardErrorResponse).error === 'object' &&
    typeof (data as StandardErrorResponse).error.message === 'string'
  );
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Number of retry attempts for failed requests (default: 2 for GET, 0 for others) */
  retries?: number;
  /** Base delay in ms between retries, doubles on each attempt (default: 1000) */
  retryDelay?: number;
}

/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if an error is retryable (network errors, 5xx, 429)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    // Retry network errors
    if (error.isNetworkError) return true;
    // Retry server errors (5xx) and rate limiting (429)
    if (error.status >= 500 || error.status === 429) return true;
  }
  return false;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let details: Record<string, string> | undefined;

    try {
      const errorData = await response.json();
      // Handle standard error format: { success: false, error: { code, message, details? } }
      if (isStandardErrorResponse(errorData)) {
        message = errorData.error.message;
        code = errorData.error.code;
        details = errorData.error.details;
      } else if (errorData.error) {
        // Handle legacy format: { error: string }
        message = typeof errorData.error === 'string' ? errorData.error : message;
      }
    } catch {
      // Use default message if parsing fails
    }
    throw new ApiRequestError(message, response.status, false, code, details);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  // Return text for non-JSON responses
  return response.text() as Promise<T>;
}

/**
 * Wraps fetch with network error handling
 */
async function fetchWithNetworkErrorHandling(
  endpoint: string,
  config: RequestInit
): Promise<Response> {
  try {
    return await fetch(endpoint, config);
  } catch (error) {
    // Network errors (no connection, CORS, etc.)
    const message =
      error instanceof Error
        ? error.message
        : 'Network error. Please check your connection.';
    throw new ApiRequestError(
      message.includes('Failed to fetch')
        ? 'Unable to connect to server. Please check your connection and try again.'
        : message,
      0,
      true
    );
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, retries, retryDelay = 1000, ...restOptions } = options;

  const config: RequestInit = {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  // Determine number of retries (default: 2 for GET, 0 for others)
  const maxRetries = retries ?? (restOptions.method === 'GET' || !restOptions.method ? 2 : 0);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithNetworkErrorHandling(endpoint, config);
      return await handleResponse<T>(response);
    } catch (error) {
      lastError = error;

      // Don't retry if not retryable or if we've exhausted retries
      if (!isRetryableError(error) || attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff: delay * 2^attempt
      const backoffDelay = retryDelay * Math.pow(2, attempt);
      await delay(backoffDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

export const api = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * Upload files using multipart/form-data.
   * Does not set Content-Type header (browser sets it with boundary).
   * No retries for uploads to avoid duplicate data.
   */
  async upload<T>(endpoint: string, files: File[]): Promise<T> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetchWithNetworkErrorHandling(endpoint, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<T>(response);
  },

  /**
   * Parse files without importing (step 1 of two-step import).
   * Returns currencies detected and a sessionId for completing the import.
   */
  async parseFiles<T>(files: File[]): Promise<T> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetchWithNetworkErrorHandling('/api/upload/parse', {
      method: 'POST',
      body: formData,
    });

    return handleResponse<T>(response);
  },

  /**
   * Complete import with conversion rates (step 2 of two-step import).
   */
  async completeImport<T>(sessionId: string, conversionRates: Record<string, number>): Promise<T> {
    return this.post<T>('/api/upload/complete', { sessionId, conversionRates });
  },

  /**
   * Get exchange rate for currency conversion.
   */
  async getExchangeRate(from: string, to: string = 'CZK'): Promise<{ from: string; to: string; rate: number }> {
    return this.get(`/api/exchange-rate?from=${from}&to=${to}`);
  },

  /**
   * Get exchange rates for multiple currencies at once.
   */
  async getExchangeRates(currencies: string[], to: string = 'CZK'): Promise<{ rates: Record<string, number>; to: string }> {
    return this.post('/api/exchange-rate/batch', { currencies, to });
  },

  /**
   * Download a file from the given endpoint.
   * Returns a Blob for the caller to handle.
   * Includes retry logic for transient failures.
   */
  async download(endpoint: string, retries = 2): Promise<{ blob: Blob; filename: string }> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithNetworkErrorHandling(endpoint, { method: 'GET' });

        if (!response.ok) {
          let message = `Download failed with status ${response.status}`;
          let code: string | undefined;
          let details: Record<string, string> | undefined;
          try {
            const errorData = await response.json();
            // Handle standard error format: { success: false, error: { code, message, details? } }
            if (isStandardErrorResponse(errorData)) {
              message = errorData.error.message;
              code = errorData.error.code;
              details = errorData.error.details;
            } else if (errorData.error) {
              // Handle legacy format: { error: string }
              message = typeof errorData.error === 'string' ? errorData.error : message;
            }
          } catch {
            // Use default message
          }
          throw new ApiRequestError(message, response.status, false, code, details);
        }

        const blob = await response.blob();

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'download';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
          if (match) {
            filename = match[1];
          }
        }

        return { blob, filename };
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error) || attempt >= retries) {
          throw error;
        }

        await delay(1000 * Math.pow(2, attempt));
      }
    }

    throw lastError;
  },
};
