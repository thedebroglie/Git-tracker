import { performance } from 'node:perf_hooks';
import { calculateScore } from '../services/scoreEngine.js';

const iterations = 10000;
const sample = {
  commits: 450,
  contributionsLast30Days: 180,
  streakDays: 55,
  prsOpened: 42,
  prsMergedExternal: 20,
  issues: 33,
  codeReviews: 24,
  meaningfulRepoCount: 11,
  stars: 145,
  forks: 40,
  watchers: 28,
  followers: 260,
  languageCount: 6,
  selfPRPercentage: 28,
  emptyRepoCount: 1,
};

const start = performance.now();
let total = 0;
for (let i = 0; i < iterations; i += 1) {
  const score = calculateScore(sample, { lastActiveAt: new Date() });
  total += score.total;
}
const end = performance.now();

const durationMs = end - start;
const avgUs = (durationMs * 1000) / iterations;

console.log(`PERF_SMOKE_ITERATIONS=${iterations}`);
console.log(`PERF_SMOKE_DURATION_MS=${durationMs.toFixed(2)}`);
console.log(`PERF_SMOKE_AVG_US=${avgUs.toFixed(2)}`);
console.log(`PERF_SMOKE_ACCUMULATED_TOTAL=${total}`);
