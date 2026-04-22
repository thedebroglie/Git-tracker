/**
 * Ephemeral key-value store with TTL.
 *
 * Uses Redis when available; falls back to an in-process Map when Redis is
 * disabled (DISABLE_QUEUE=true / dev mode without REDIS_URL).  The in-memory
 * fallback is intentionally volatile — data is lost on restart — which is
 * fine for short-lived OAuth state tokens and rate-limit counters in dev.
 */
import { redis } from '../config/redis.js';

const isRedisDisabled = redis.status === 'end' || typeof redis.setex !== 'function';

// ── In-memory fallback ────────────────────────────────────────────────────────
const memStore = new Map(); // key → { value, expiresAt }

function memSet(key, value, ttlSeconds) {
  memStore.set(key, {
    value: String(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function memGet(key) {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memDel(key) {
  memStore.delete(key);
}

// Periodically evict expired entries (every 5 min) to avoid unbounded growth.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (now > v.expiresAt) memStore.delete(k);
  }
}, 5 * 60 * 1000).unref();

// ── Public API ────────────────────────────────────────────────────────────────

async function setWithTTL(key, value, ttlSeconds) {
  if (isRedisDisabled) {
    memSet(key, value, ttlSeconds);
    return 'memory';
  }
  await redis.setex(key, ttlSeconds, value);
  return 'redis';
}

async function getValue(key) {
  if (isRedisDisabled) return memGet(key);
  return redis.get(key);
}

async function deleteKey(key) {
  if (isRedisDisabled) {
    memDel(key);
    return;
  }
  await redis.del(key);
}

async function setIfNotExistsWithTTL(key, value, ttlSeconds) {
  if (isRedisDisabled) {
    if (memGet(key) !== null) return false;
    memSet(key, value, ttlSeconds);
    return true;
  }
  const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export { setWithTTL, getValue, deleteKey, setIfNotExistsWithTTL };
