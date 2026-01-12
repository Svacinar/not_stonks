/**
 * API client utility for backend calls.
 * Handles errors uniformly and provides typed responses.
 */

export interface ApiError {
  message: string;
  status: number;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        message = errorData.error;
      }
    } catch {
      // Use default message if parsing fails
    }
    throw new ApiRequestError(message, response.status);
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

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, ...restOptions } = options;

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

  const response = await fetch(endpoint, config);
  return handleResponse<T>(response);
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
   */
  async upload<T>(endpoint: string, files: File[]): Promise<T> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<T>(response);
  },

  /**
   * Download a file from the given endpoint.
   * Returns a Blob for the caller to handle.
   */
  async download(endpoint: string): Promise<{ blob: Blob; filename: string }> {
    const response = await fetch(endpoint);

    if (!response.ok) {
      let message = `Download failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          message = errorData.error;
        }
      } catch {
        // Use default message
      }
      throw new ApiRequestError(message, response.status);
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
  },
};
