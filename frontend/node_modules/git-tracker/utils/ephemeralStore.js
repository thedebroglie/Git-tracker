import { redis } from '../config/redis.js';

const memoryStore = new Map();

function nowMs() {
  return Date.now();
}

function cleanupExpired(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    memoryStore.delete(key);
    return null;
  }
  return entry;
}

async function setWithTTL(key, value, ttlSeconds) {
  try {
    await redis.setex(key, ttlSeconds, value);
    return 'redis';
  } catch (error) {
    memoryStore.set(key, {
      value,
      expiresAt: nowMs() + ttlSeconds * 1000,
    });
    return 'memory';
  }
}

async function getValue(key) {
  try {
    return await redis.get(key);
  } catch (error) {
    const entry = cleanupExpired(key);
    return entry ? entry.value : null;
  }
}

async function deleteKey(key) {
  try {
    await redis.del(key);
    return;
  } catch (error) {
    memoryStore.delete(key);
  }
}

async function setIfNotExistsWithTTL(key, value, ttlSeconds) {
  try {
    const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    const existing = cleanupExpired(key);
    if (existing) {
      return false;
    }
    memoryStore.set(key, {
      value,
      expiresAt: nowMs() + ttlSeconds * 1000,
    });
    return true;
  }
}

export { setWithTTL, getValue, deleteKey, setIfNotExistsWithTTL };
