import Redis from 'ioredis';

const isDev = (process.env.NODE_ENV || 'development') === 'development';
const isQueueDisabled =
  process.env.DISABLE_QUEUE === 'true' ||
  process.env.NODE_ENV === 'test';

// Skip creating any Redis connection when queues are disabled or
// we're in dev without an explicit REDIS_URL configured.
const shouldSkipRedis = isQueueDisabled || (isDev && !process.env.REDIS_URL);

if (shouldSkipRedis) {
  console.log('[Redis] Skipping connection (DISABLE_QUEUE=true or dev mode without REDIS_URL)');
}

// In prod, retry up to 3 times with exponential backoff.
const retryStrategy = isDev
  ? () => null // never retry in dev — fail fast and quiet
  : (times) => {
      if (times > 3) {
        console.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 200, 2000);
    };

const baseOptions = {
  maxRetriesPerRequest: null, // required by BullMQ
  enableOfflineQueue: false,  // don't buffer commands when disconnected
  lazyConnect: true,          // don't auto-connect on instantiation
  retryStrategy,
};

// Null-safe stub used when Redis is disabled — satisfies callers without connecting
const noopRedis = {
  ping: async () => { throw new Error('Redis disabled'); },
  get: async () => null,
  set: async () => 'OK',
  del: async () => 0,
  status: 'end',
  on: () => noopRedis,
};

// Main Redis client for caching operations
let redis;
if (shouldSkipRedis) {
  redis = noopRedis;
} else if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, baseOptions);
} else {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    ...baseOptions,
  });
}

if (!shouldSkipRedis) {
  redis.on('connect', () => console.log('Redis connected'));
  redis.on('error', (err) => {
    if (!isDev || redis.status === 'end') {
      console.error('Redis error:', err.message);
    }
  });
  // Trigger connection now (lazyConnect=true means it didn't connect automatically)
  redis.connect().catch(() => {}); // errors handled by 'error' event above
}

// Separate connection config object for BullMQ.
// When disabled, use a plain options object — BullMQ won't use it because
// syncQueue.js mocks the queue when DISABLE_QUEUE=true.
let redisConnection;
if (shouldSkipRedis) {
  redisConnection = { host: 'localhost', port: 6379, maxRetriesPerRequest: null };
} else if (process.env.REDIS_URL) {
  redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy,
  });
} else {
  redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
  };
}

export { redis, redisConnection };
