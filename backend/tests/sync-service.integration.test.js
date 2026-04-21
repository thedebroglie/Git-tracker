import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncStudent } from '../services/syncService.js';

test('sync pipeline persists score outputs and returns structured result', async () => {
  const fixedNow = new Date('2026-04-17T10:00:00.000Z');

  const studentDoc = {
    _id: 'stu-1',
    name: 'Test Student',
    githubConnected: true,
    githubUsername: 'teststudent',
    lastSyncedAt: new Date('2026-04-15T10:00:00.000Z'),
    rankHistory: [],
    avatar: 'old-avatar',
    bio: 'old-bio',
  };

  let cacheInvalidatedFor = null;
  let leaderboardInvalidated = false;
  let statsUpsert = null;
  let studentUpdate = null;

  const StudentModel = {
    findById: async (id) => (id === 'stu-1' ? studentDoc : null),
    findByIdAndUpdate: async (id, update) => {
      studentUpdate = { id, update };
      return { _id: id, ...update };
    },
  };

  const GithubStatsModel = {
    findOneAndUpdate: async (query, update, options) => {
      statsUpsert = { query, update, options };
      return { _id: 'stats-1', ...update };
    },
  };

  const rawStats = {
    commits: 120,
    contributionsLast30Days: 45,
    streakDays: 12,
    prsOpened: 8,
    prsMergedExternal: 5,
    prsMergedTotal: 7,
    issues: 4,
    codeReviews: 9,
    meaningfulRepoCount: 6,
    totalRepoCount: 9,
    emptyRepoCount: 1,
    stars: 33,
    forks: 6,
    watchers: 10,
    followers: 14,
    languageCount: 4,
    languageList: ['JavaScript', 'TypeScript'],
    selfPRPercentage: 11,
    avatar: 'new-avatar',
    bio: 'new-bio',
    fromCache: false,
  };

  const syncStudent = createSyncStudent({
    StudentModel,
    GithubStatsModel,
    fetchGithubStatsFn: async (username) => {
      assert.equal(username, 'teststudent');
      return rawStats;
    },
    invalidateCacheFn: async (username) => {
      cacheInvalidatedFor = username;
    },
    analyzeFn: (stats) => ({
      cleanedStats: stats,
      flags: [],
      isFlagged: false,
    }),
    calculateScoreFn: () => ({
      total: 1337,
      breakdown: { PAS: 1000, OCS: 200, PIS: 80, CIS: 40, SDS: 17 },
      capsApplied: { commits: 120 },
      effectiveCommits: 110,
      qualityScore: 0.92,
      qualityBreakdown: { volumeScore: 0.8 },
      daysSinceActivity: 2,
      decayFactor: 0.88,
      scoreVersion: 'v4-cqe-decay-1',
    }),
    getTierFn: (score) => {
      assert.equal(score, 1337);
      return 'Silver';
    },
    calculateRankFn: async (score, id) => {
      assert.equal(score, 1337);
      assert.equal(id, 'stu-1');
      return 4;
    },
    invalidateLeaderboardCacheFn: async () => {
      leaderboardInvalidated = true;
    },
    now: () => fixedNow,
    nowMs: () => fixedNow.getTime(),
  });

  const result = await syncStudent('stu-1', { skipCooldown: true });

  assert.equal(cacheInvalidatedFor, 'teststudent');
  assert.equal(leaderboardInvalidated, true);

  assert.ok(statsUpsert);
  assert.deepEqual(statsUpsert.query, { userId: 'stu-1' });
  assert.equal(statsUpsert.update.scoreVersion, 'v4-cqe-decay-1');
  assert.equal(statsUpsert.update.fromCache, false);

  assert.ok(studentUpdate);
  assert.equal(studentUpdate.id, 'stu-1');
  assert.equal(studentUpdate.update.score, 1337);
  assert.equal(studentUpdate.update.tierRank, 'Silver');
  assert.equal(studentUpdate.update.leaderboardRank, 4);
  assert.deepEqual(studentUpdate.update.antiCheatFlags, []);
  assert.equal(studentUpdate.update.antiCheatReview.status, 'reviewed');
  assert.equal(studentUpdate.update.antiCheatReview.reviewedBy, 'system');

  assert.equal(result.studentId, 'stu-1');
  assert.equal(result.githubUsername, 'teststudent');
  assert.equal(result.score, 1337);
  assert.equal(result.rank, 4);
  assert.equal(result.qualityScore, 0.92);
  assert.equal(result.syncedAt.toISOString(), fixedNow.toISOString());
});

test('sync pipeline enforces cooldown for manual sync calls', async () => {
  const fixedNowMs = Date.parse('2026-04-17T10:00:00.000Z');
  const recentSync = new Date(fixedNowMs - 5 * 60 * 1000); // 5 minutes ago

  const StudentModel = {
    findById: async () => ({
      _id: 'stu-2',
      name: 'Cooldown User',
      githubConnected: true,
      githubUsername: 'cooldown-user',
      lastSyncedAt: recentSync,
    }),
    findByIdAndUpdate: async () => {
      throw new Error('Should not update student when cooldown is active');
    },
  };

  let fetchCalled = false;

  const syncStudent = createSyncStudent({
    StudentModel,
    GithubStatsModel: { findOneAndUpdate: async () => ({}) },
    fetchGithubStatsFn: async () => {
      fetchCalled = true;
      return {};
    },
    analyzeFn: () => ({ cleanedStats: {}, flags: [], isFlagged: false }),
    calculateScoreFn: () => ({
      total: 0,
      breakdown: {},
      capsApplied: {},
      effectiveCommits: 0,
      qualityScore: 0,
      qualityBreakdown: {},
      daysSinceActivity: 0,
      decayFactor: 1,
      scoreVersion: 'test',
    }),
    getTierFn: () => 'Bronze',
    calculateRankFn: async () => 1,
    invalidateCacheFn: async () => {},
    invalidateLeaderboardCacheFn: async () => {},
    nowMs: () => fixedNowMs,
  });

  const previousCooldown = process.env.SYNC_COOLDOWN_MINUTES;
  process.env.SYNC_COOLDOWN_MINUTES = '30';

  try {
    await assert.rejects(
      () => syncStudent('stu-2', { skipCooldown: false }),
      (err) => {
        const parsed = JSON.parse(err.message);
        assert.equal(parsed.error, 'Cooldown active');
        assert.ok(parsed.remainingSeconds > 0);
        return true;
      }
    );

    assert.equal(fetchCalled, false);
  } finally {
    process.env.SYNC_COOLDOWN_MINUTES = previousCooldown;
  }
});
