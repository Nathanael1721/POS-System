'use client';

import { tokenStore, isAccessExpired } from './auth';
import { BACKEND_BASE } from './backend-url';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Skip the Authorization header (for login/refresh). */
  anonymous?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

/** Refresh the access token using the stored refresh token (single-flight). */
async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) {
          tokenStore.clear();
          return null;
        }
        const data = (await res.json()) as { access_token: string; refresh_token?: string };
        tokenStore.setAccess(data.access_token);
        if (data.refresh_token) {
          window.localStorage.setItem('simplepos.refresh_token', data.refresh_token);
        }
        return data.access_token;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = path.startsWith('http') ? new URL(path) : new URL(path, BACKEND_BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function doFetch<T>(path: string, opts: RequestOptions, accessToken: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!opts.anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err = data as { error?: string; code?: string; details?: unknown } | undefined;
    throw new ApiClientError(
      res.status,
      err?.code ?? 'ERROR',
      err?.error ?? `Request failed (${res.status})`,
      err?.details,
    );
  }
  return data as T;
}

/**
 * Typed fetch wrapper. Automatically attaches the access token and transparently
 * refreshes it once on 401 / expiry.
 */
export async function apiClient<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let access = tokenStore.getAccess();

  if (!opts.anonymous && isAccessExpired(access)) {
    access = await refreshAccessToken();
  }

  try {
    return await doFetch<T>(path, opts, access);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401 && !opts.anonymous) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return doFetch<T>(path, opts, refreshed);
    }
    throw err;
  }
}

async function doUpload<T>(path: string, formData: FormData, accessToken: string | null): Promise<T> {
  // NOTE: do not set Content-Type — the browser sets the multipart boundary.
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(buildUrl(path), { method: 'POST', headers, body: formData });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const e = data as { error?: string; code?: string; details?: unknown } | undefined;
    throw new ApiClientError(res.status, e?.code ?? 'ERROR', e?.error ?? `Upload failed (${res.status})`, e?.details);
  }
  return data as T;
}

/** Upload multipart form-data (e.g. a file) with the same auth/refresh handling. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  let access = tokenStore.getAccess();
  if (isAccessExpired(access)) access = await refreshAccessToken();
  try {
    return await doUpload<T>(path, formData, access);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return doUpload<T>(path, formData, refreshed);
    }
    throw err;
  }
}

/**
 * Download an authenticated file (e.g. CSV export) and save it via the
 * browser's download machinery. Uses the same token/refresh flow as apiClient.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  async function rawFetch(token: string | null): Promise<Response> {
    return fetch(buildUrl(path), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  let access = tokenStore.getAccess();
  if (isAccessExpired(access)) access = await refreshAccessToken();
  let res = await rawFetch(access);
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await rawFetch(refreshed);
  }
  if (!res.ok) {
    throw new ApiClientError(res.status, 'ERROR', `Gagal mengunduh berkas (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
