import { redis } from '../config/redis.js';

async function setWithTTL(key, value, ttlSeconds) {
  await redis.setex(key, ttlSeconds, value);
  return 'redis';
}

async function getValue(key) {
  return redis.get(key);
}

async function deleteKey(key) {
  await redis.del(key);
}

async function setIfNotExistsWithTTL(key, value, ttlSeconds) {
  const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export { setWithTTL, getValue, deleteKey, setIfNotExistsWithTTL };
