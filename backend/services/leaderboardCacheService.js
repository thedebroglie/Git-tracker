import { redis } from '../config/redis.js';

const LEADERBOARD_CACHE_PREFIX = 'leaderboard:v1';
const LEADERBOARD_CACHE_TTL_SECONDS = 300;

function normalizeQueryValue(value) {
  if (value === undefined || value === null || value === '') return 'all';
  return String(value).trim().toLowerCase();
}

function buildLeaderboardCacheKey(scope, query = {}) {
  const normalized = {
    branch: normalizeQueryValue(query.branch),
    year: normalizeQueryValue(query.year),
    tier: normalizeQueryValue(query.tier),
    cohort: normalizeQueryValue(query.cohort),
    page: normalizeQueryValue(query.page),
    limit: normalizeQueryValue(query.limit),
  };

  return `${LEADERBOARD_CACHE_PREFIX}:${scope}:${JSON.stringify(normalized)}`;
}

async function getCachedLeaderboard(key) {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    return null;
  }
}

async function setCachedLeaderboard(key, value, ttlSeconds = LEADERBOARD_CACHE_TTL_SECONDS) {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    // Degrade gracefully when Redis is unavailable.
  }
}

async function invalidateLeaderboardCache() {
  try {
    const keys = await redis.keys(`${LEADERBOARD_CACHE_PREFIX}:*`);
    if (!keys || keys.length === 0) return 0;
    await redis.del(keys);
    return keys.length;
  } catch (error) {
    return 0;
  }
}

export {
  buildLeaderboardCacheKey,
  getCachedLeaderboard,
  setCachedLeaderboard,
  invalidateLeaderboardCache,
};
