import type { PaginatedResponse } from "@/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.baseUrl}${path}`;
  }

  private async getErrorMessage(response: Response): Promise<string> {
    const error = await response.json().catch(() => null);

    if (!error) {
      return `Request failed: ${response.status}`;
    }

    if (typeof error.detail === 'string') {
      return error.detail;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object') {
      const fragments = Object.entries(error)
        .flatMap(([field, value]) => {
          if (Array.isArray(value)) {
            return value.map((item) => `${field}: ${item}`);
          }

          if (typeof value === 'string') {
            return `${field}: ${value}`;
          }

          return [];
        })
        .filter(Boolean);

      if (fragments.length > 0) {
        return fragments.join(' ');
      }
    }

    return `Request failed: ${response.status}`;
  }

  private async request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(this.buildUrl(path), {
      ...options,
      headers,
    });

    if (response.status === 401 && allowRefresh) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(path, options, false);
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }

    if (response.status === 204) return {} as T;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {} as T;
    }
    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      return true;
    } catch {
      return false;
    }
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async upload<T>(path: string, formData: FormData, allowRefresh = true): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(this.buildUrl(path), {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401 && allowRefresh) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.upload<T>(path, formData, false);
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response));
    }
    return response.json();
  }

  async listAll<T>(path: string): Promise<T[]> {
    const results: T[] = [];
    let next: string | null = path;

    while (next) {
      const page = await this.get<PaginatedResponse<T>>(next);
      results.push(...page.results);
      next = page.next;
    }

    return results;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
