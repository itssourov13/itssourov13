import { API_ROOT, USER_AGENT } from '../constants.ts';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
export class RateLimitError extends HttpError {
  resetAt?: string;
  constructor(message: string, resetAt?: string) {
    super(403, message);
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
  }
}
export class ApiShapeError extends Error {
  constructor(message: string) {
    super(`Unexpected GitHub API response: ${message}`);
    this.name = 'ApiShapeError';
  }
}

export interface RequestOptions {
  token?: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * JSON request to api.github.com with timeout, bounded retries and exponential backoff.
 * The token is only ever placed in the Authorization header and is never logged.
 */
export async function requestJson(url: string, opts: RequestOptions = {}): Promise<unknown> {
  if (!url.startsWith(`${API_ROOT}/`)) throw new Error(`Refusing request outside ${API_ROOT}`);
  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const retries = opts.retries ?? 3;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
    let res: Response;
    try {
      res = await doFetch(url, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      });
    } catch (err) {
      lastError = err; // network error / timeout → retry
      continue;
    }
    if (res.ok) {
      try {
        return await res.json();
      } catch {
        throw new HttpError(res.status, `Invalid JSON from ${new URL(url).pathname}`);
      }
    }
    if (res.status === 403 || res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after'));
      if (Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 30 && attempt < retries) {
        await sleep(retryAfter * 1000);
        lastError = new HttpError(res.status, 'rate limited');
        continue;
      }
      if (res.status === 429 || res.headers.get('x-ratelimit-remaining') === '0') {
        const reset = Number(res.headers.get('x-ratelimit-reset'));
        throw new RateLimitError(
          'GitHub API rate limit reached',
          Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000).toISOString() : undefined,
        );
      }
    }
    if (res.status >= 500) {
      lastError = new HttpError(res.status, `Server error ${res.status}`);
      continue;
    }
    throw new HttpError(res.status, `HTTP ${res.status} for ${new URL(url).pathname}`);
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
