import { type Request, type Response, type RequestHandler } from 'express';
import { rateLimit, type Options } from 'express-rate-limit';

/**
 * Default limiter values. Tunable via the RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS
 * environment variables (see {@link defaultOptions}).
 */
export const DEFAULT_RATE_LIMIT_MAX = 100;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
/**
 * Under `NODE_ENV=test` the global limiter is effectively disabled with a very
 * high ceiling so the unit/integration and e2e suites — which fire many
 * requests — are never throttled. Tests that need to exercise the 429 path pass
 * an explicit low `max` to {@link createRateLimiter}.
 */
export const TEST_RATE_LIMIT_MAX = 1_000_000;

/**
 * Options controlling the rate limiter behaviour.
 */
export interface RateLimiterOptions {
  /** Maximum requests allowed within the window. Defaults to RATE_LIMIT_MAX env var or {@link DEFAULT_RATE_LIMIT_MAX}. */
  max: number;
  /** Fixed-window duration in milliseconds. Defaults to RATE_LIMIT_WINDOW_MS env var or {@link DEFAULT_RATE_LIMIT_WINDOW_MS}. */
  windowMs: number;
  /** Paths that are completely exempt from rate limiting (exact match against req.path). */
  exemptPaths?: string[];
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Build the default options, resolving values from environment variables.
 *
 * `exemptPaths` are matched against `req.path` inside the middleware. When the
 * middleware is mounted at `/api` (i.e. `app.use('/api', limiter)`), Express
 * strips the mount prefix, so the health path becomes `/health`.
 *
 * Under `NODE_ENV=test` the default `max` is raised to {@link TEST_RATE_LIMIT_MAX}
 * unless `RATE_LIMIT_MAX` is explicitly set, so the test suites are not throttled.
 */
export function defaultOptions(): RateLimiterOptions {
  const baseMax = process.env.NODE_ENV === 'test' ? TEST_RATE_LIMIT_MAX : DEFAULT_RATE_LIMIT_MAX;
  return {
    max: readEnvInt('RATE_LIMIT_MAX', baseMax),
    windowMs: readEnvInt('RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS),
    exemptPaths: ['/health'],
  };
}

/**
 * Create a per-IP rate-limiting middleware backed by `express-rate-limit`.
 *
 * The store is the library's default in-memory store (resets on restart, no
 * external service). `GET /api/health` (and any other path listed in
 * `exemptPaths`) is exempt. Exceeding the limit yields HTTP 429 with a JSON
 * body and a standard `RateLimit-*` / `Retry-After` header set.
 *
 * **Deployment note — trust proxy:** `express-rate-limit` keys on `req.ip`,
 * which resolves to the remote socket address by default. When deployed behind
 * a reverse proxy or load balancer, call `app.set('trust proxy', <hops>)` so
 * Express reads the real client IP from `X-Forwarded-For`. Only trust the
 * number of proxy hops you control; trusting all forwarded headers lets clients
 * spoof IPs and bypass the limit.
 */
export function createRateLimiter(opts: Partial<RateLimiterOptions> = {}): RequestHandler {
  const { max, windowMs, exemptPaths } = { ...defaultOptions(), ...opts };
  const exempt = new Set(exemptPaths ?? []);

  const config: Partial<Options> = {
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Exact-match exemptions (e.g. health checks) skip the limiter entirely.
    skip: (req: Request) => exempt.has(req.path),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: 'Too Many Requests' });
    },
  };

  return rateLimit(config);
}
