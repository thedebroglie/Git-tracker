/**
 * Ephemeral key-value store with TTL.
 *
 * Uses Redis when available; falls back to an in-process Map when Redis is
 * disconnected or disabled.
 */
import { redis } from '../config/redis.js';

// Helper to check if Redis is currently able to handle commands.
// ioredis status must be 'ready' for commands to execute without buffering/hanging.
function isRedisAvailable() {
  return redis && redis.status === 'ready' && typeof redis.setex === 'function';
}

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

// Periodically evict expired entries (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (now > v.expiresAt) memStore.delete(k);
  }
}, 5 * 60 * 1000).unref();

// ── Public API ────────────────────────────────────────────────────────────────

async function setWithTTL(key, value, ttlSeconds) {
  if (!isRedisAvailable()) {
    memSet(key, value, ttlSeconds);
    return 'memory';
  }
  try {
    await redis.setex(key, ttlSeconds, value);
    return 'redis';
  } catch (error) {
    console.warn(`[EphemeralStore] Redis setex failed, falling back to memory: ${error.message}`);
    memSet(key, value, ttlSeconds);
    return 'memory';
  }
}

async function getValue(key) {
  if (!isRedisAvailable()) return memGet(key);
  try {
    return await redis.get(key);
  } catch (error) {
    console.warn(`[EphemeralStore] Redis get failed, falling back to memory: ${error.message}`);
    return memGet(key);
  }
}

async function deleteKey(key) {
  if (!isRedisAvailable()) {
    memDel(key);
    return;
  }
  try {
    await redis.del(key);
  } catch (error) {
    memDel(key);
  }
}

async function setIfNotExistsWithTTL(key, value, ttlSeconds) {
  if (!isRedisAvailable()) {
    if (memGet(key) !== null) return false;
    memSet(key, value, ttlSeconds);
    return true;
  }
  try {
    const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    if (memGet(key) !== null) return false;
    memSet(key, value, ttlSeconds);
    return true;
  }
}

export { setWithTTL, getValue, deleteKey, setIfNotExistsWithTTL };
