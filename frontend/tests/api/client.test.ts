import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiRequestError } from '../../src/api/client';

describe('api/client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ApiRequestError', () => {
    it('creates error with message, status, and isNetworkError', () => {
      const error = new ApiRequestError('Test error', 500, true);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.isNetworkError).toBe(true);
      expect(error.name).toBe('ApiRequestError');
    });

    it('defaults isNetworkError to false', () => {
      const error = new ApiRequestError('Test error', 400);
      expect(error.isNetworkError).toBe(false);
    });
  });

  describe('api.get', () => {
    it('makes GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await api.get<{ data: string }>('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual({ data: 'test' });
    });

    it('handles 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const result = await api.get('/api/test');
      expect(result).toBeUndefined();
    });

    it('handles text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('plain text'),
      });

      const result = await api.get<string>('/api/test');
      expect(result).toBe('plain text');
    });

    it('throws ApiRequestError on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      try {
        await api.get('/api/test', { retries: 0 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).message).toBe('Not found');
      }
    });

    it('uses default error message when JSON parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      try {
        await api.get('/api/test', { retries: 0 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).message).toContain('status 500');
      }
    });

    it('retries on 5xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ error: 'Service Unavailable' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ data: 'success' }),
        });

      const result = await api.get<{ data: string }>('/api/test', { retries: 1, retryDelay: 1 });
      expect(result).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ data: 'success' }),
        });

      const result = await api.get<{ data: string }>('/api/test', { retries: 1, retryDelay: 1 });
      expect(result).toEqual({ data: 'success' });
    });

    it('throws after max retries exhausted', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service Unavailable' }),
      });

      await expect(api.get('/api/test', { retries: 2, retryDelay: 1 })).rejects.toThrow('Service Unavailable');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('does not retry on 4xx errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request' }),
      });

      await expect(api.get('/api/test', { retries: 2 })).rejects.toThrow('Bad Request');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('api.post', () => {
    it('makes POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 1 }),
      });

      const result = await api.post<{ id: number }>('/api/test', { name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'test' }),
      });
      expect(result).toEqual({ id: 1 });
    });

    it('does not retry POST requests by default', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'Service Unavailable' }),
      });

      await expect(api.post('/api/test', {})).rejects.toThrow('Service Unavailable');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('api.patch', () => {
    it('makes PATCH request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 1, name: 'updated' }),
      });

      const result = await api.patch<{ id: number; name: string }>('/api/test/1', { name: 'updated' });

      expect(mockFetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'updated' }),
      });
      expect(result).toEqual({ id: 1, name: 'updated' });
    });
  });

  describe('api.delete', () => {
    it('makes DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      await api.delete('/api/test/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('api.upload', () => {
    it('uploads files using FormData', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ imported: 10 }),
      });

      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const result = await api.upload<{ imported: number }>('/api/upload', [file]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/upload');
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);
      expect(result).toEqual({ imported: 10 });
    });

    it('throws ApiRequestError on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid file' }),
      });

      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      await expect(api.upload('/api/upload', [file])).rejects.toThrow('Invalid file');
    });
  });

  describe('api.download', () => {
    it('downloads file and extracts filename from header', async () => {
      const blob = new Blob(['file content'], { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-disposition': 'attachment; filename="transactions.csv"',
        }),
        blob: () => Promise.resolve(blob),
      });

      const result = await api.download('/api/export');

      expect(result.blob).toBe(blob);
      expect(result.filename).toBe('transactions.csv');
    });

    it('uses default filename when header is missing', async () => {
      const blob = new Blob(['file content']);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        blob: () => Promise.resolve(blob),
      });

      const result = await api.download('/api/export');

      expect(result.filename).toBe('download');
    });

    it('retries on failure', async () => {
      const blob = new Blob(['file content']);
      mockFetch
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          blob: () => Promise.resolve(blob),
        });

      const result = await api.download('/api/export', 1);

      expect(result.blob).toBe(blob);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws on download error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'File not found' }),
      });

      await expect(api.download('/api/export', 0)).rejects.toThrow('File not found');
    });
  });

  describe('network error handling', () => {
    it('wraps network errors with friendly message', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      try {
        await api.get('/api/test', { retries: 0 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).isNetworkError).toBe(true);
        expect((error as ApiRequestError).status).toBe(0);
        expect((error as ApiRequestError).message).toContain('Unable to connect');
      }
    });

    it('preserves non-fetch error messages', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Some other error'));

      try {
        await api.get('/api/test', { retries: 0 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).message).toBe('Some other error');
      }
    });
  });
});
