import { getValue, setWithTTL } from '../utils/ephemeralStore.js';

function sanitizeIdentifier(value) {
  if (!value) return 'unknown';
  return String(value).replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 120);
}

function createRequestRateLimiter({
  keyPrefix,
  windowSeconds,
  maxRequests,
  identity = 'ip',
}) {
  if (!keyPrefix || !windowSeconds || !maxRequests) {
    throw new Error('Rate limiter requires keyPrefix, windowSeconds, and maxRequests');
  }

  return async (req, res, next) => {
    try {
      const rawIdentity =
        identity === 'user'
          ? req.user?._id || req.user?.enrollmentId || req.ip
          : req.ip;

      const identityKey = sanitizeIdentifier(rawIdentity);
      const key = `${keyPrefix}:${identityKey}`;

      const existing = await getValue(key);
      const count = existing ? parseInt(existing, 10) || 0 : 0;

      if (count >= maxRequests) {
        res.setHeader('Retry-After', String(windowSeconds));
        return res.status(429).json({
          error: 'Too many requests. Please try again shortly.',
          code: 'RATE_LIMITED',
          limit: maxRequests,
          windowSeconds,
        });
      }

      await setWithTTL(key, String(count + 1), windowSeconds);
      return next();
    } catch (error) {
      // Store failure is non-fatal — degrade gracefully rather than blocking the request.
      console.warn(`[RateLimit] Store error for ${keyPrefix}, skipping limit check: ${error.message}`);
      return next();
    }
  };
}

export { createRequestRateLimiter };
