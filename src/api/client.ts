import { z } from 'zod';

/**
 * The single HTTP boundary. Everything that talks to Phase 4 goes through here:
 * base URL, `X-API-Key`, the error envelope, and the runtime shape guard.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
export const API_PREFIX = '/api/v1';

export function apiBaseUrl(): string {
  return BASE_URL;
}

/** True when no key is configured, so the shell can say so instead of 401-looping. */
export function hasApiKey(): boolean {
  return API_KEY.length > 0 && API_KEY !== 'replace-me-in-env-local';
}

/**
 * `{"error": {"code", "message", "detail", "request_id"}}` -- the one envelope every
 * Phase 4 failure shares. Parsed rather than assumed, because an analyst filing a bug
 * has to be able to quote `request_id` and it must not be `undefined`.
 */
const errorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    detail: z.unknown().optional(),
    request_id: z.string().optional(),
  }),
});

/** FastAPI's own 422 body, which does not use the envelope. */
const validationEnvelope = z.object({
  detail: z.array(
    z.object({
      loc: z.array(z.union([z.string(), z.number()])),
      msg: z.string(),
      type: z.string(),
    }),
  ),
});

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly detail: unknown;

  constructor(args: {
    code: string;
    message: string;
    status: number;
    requestId?: string | undefined;
    detail?: unknown;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.code = args.code;
    this.status = args.status;
    this.requestId = args.requestId;
    this.detail = args.detail;
  }

  /** 401/403 mean "your key is wrong or lacks the scope", not "no data". */
  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return new ApiError({
      code: `http_${res.status}`,
      message: res.statusText || 'Request failed',
      status: res.status,
    });
  }

  const enveloped = errorEnvelope.safeParse(body);
  if (enveloped.success) {
    const e = enveloped.data.error;
    return new ApiError({
      code: e.code,
      message: e.message,
      status: res.status,
      requestId: e.request_id,
      detail: e.detail,
    });
  }

  const validation = validationEnvelope.safeParse(body);
  if (validation.success) {
    const first = validation.data.detail[0];
    return new ApiError({
      code: 'validation_error',
      message: first ? `${first.loc.join('.')}: ${first.msg}` : 'Request validation failed',
      status: res.status,
      detail: validation.data.detail,
    });
  }

  return new ApiError({
    code: `http_${res.status}`,
    message: res.statusText || 'Request failed',
    status: res.status,
    detail: body,
  });
}

export type QueryValue = string | number | boolean | null | undefined | readonly string[];
export type QueryParams = Record<string, QueryValue>;

/**
 * Repeated keys for arrays -- FastAPI reads `?platform=a&platform=b`, never a CSV.
 * `null`/`undefined`/empty-array are omitted so an unset filter is absent rather
 * than sent as an empty string (which the backend would treat as a value).
 */
export function buildSearchParams(params: QueryParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v !== '') sp.append(key, String(v));
    } else {
      sp.append(key, String(value));
    }
  }
  sp.sort();
  return sp;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  params?: QueryParams;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body, formData, signal } = options;

  const qs = params ? buildSearchParams(params).toString() : '';
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (cause) {
    // Backend killed mid-session, DNS gone, CORS refused. Surfaced as a normal
    // ErrorState rather than a white screen.
    if (signal?.aborted) throw cause;
    throw new ApiError({
      code: 'network_error',
      message: `Cannot reach the API at ${BASE_URL}. Is the Phase 4 backend running?`,
      status: 0,
      detail: String(cause),
    });
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return (await res.blob()) as T;

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: QueryParams, signal?: AbortSignal) =>
    request<T>(`${API_PREFIX}${path}`, { method: 'GET', params, signal }),

  post: <T>(path: string, body?: unknown, params?: QueryParams) =>
    request<T>(`${API_PREFIX}${path}`, { method: 'POST', body, params }),

  postForm: <T>(path: string, formData: FormData, params?: QueryParams) =>
    request<T>(`${API_PREFIX}${path}`, { method: 'POST', formData, params }),

  patch: <T>(path: string, body: unknown, params?: QueryParams) =>
    request<T>(`${API_PREFIX}${path}`, { method: 'PATCH', body, params }),

  delete: <T>(path: string, params?: QueryParams) =>
    request<T>(`${API_PREFIX}${path}`, { method: 'DELETE', params }),

  /** `/healthz` and `/readyz` sit outside `/api/v1`. */
  root: <T>(path: string) => request<T>(path),
};

/**
 * Runtime guard at the client boundary. Zod validates the handful of invariants the
 * UI genuinely cannot recover from (a page envelope without `items`, a metric
 * without a `definition` to put in its tooltip). It deliberately does not restate
 * the whole contract -- `schema.d.ts` is the contract, and a second hand-written
 * copy of 111 schemas is exactly the drift constraint 2 forbids.
 */
export const guards = {
  page: z.object({
    items: z.array(z.unknown()),
    next_cursor: z.string().nullish(),
    total: z.number().nullish(),
    filters_applied: z.record(z.string(), z.unknown()).optional(),
  }),
  metric: z.object({
    value: z.number().nullable(),
    label: z.string(),
    definition: z.string(),
  }),
};

/** Throws a diagnosable ApiError instead of letting a bad shape crash a render. */
export function assertShape<T>(value: unknown, schema: z.ZodType, where: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError({
      code: 'contract_violation',
      message: `Response from ${where} does not match the contract. This is a Phase 4 contract violation -- file it rather than patching the UI.`,
      status: 0,
      detail: parsed.error.issues,
    });
  }
  return value as T;
}
