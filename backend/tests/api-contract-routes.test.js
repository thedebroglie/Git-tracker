import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import jsonwebtoken from 'jsonwebtoken';

import { redis } from '../config/redis.js';
import Student from '../models/Student.js';
import GithubStats from '../models/GithubStats.js';
import NormalizedContributionEvent from '../models/NormalizedContributionEvent.js';
import WebhookIngestionEnvelope from '../models/WebhookIngestionEnvelope.js';

import authRoutes from '../routes/authRoutes.js';
import syncRoutes from '../routes/syncRoutes.js';
import leaderboardRoutes from '../routes/leaderboardRoutes.js';
import securityRoutes from '../routes/securityRoutes.js';

const originalMethods = {
  redisGet: redis.get,
  redisSetex: redis.setex,
  redisSet: redis.set,
  redisDel: redis.del,
  redisKeys: redis.keys,
  redisPing: redis.ping,
  studentFindById: Student.findById,
  studentFind: Student.find,
  studentCountDocuments: Student.countDocuments,
  githubStatsFindOne: GithubStats.findOne,
  normalizedCountDocuments: NormalizedContributionEvent.countDocuments,
  envelopesCountDocuments: WebhookIngestionEnvelope.countDocuments,
};

function restorePatchedMethods() {
  redis.get = originalMethods.redisGet;
  redis.setex = originalMethods.redisSetex;
  redis.set = originalMethods.redisSet;
  redis.del = originalMethods.redisDel;
  redis.keys = originalMethods.redisKeys;
  redis.ping = originalMethods.redisPing;

  Student.findById = originalMethods.studentFindById;
  Student.find = originalMethods.studentFind;
  Student.countDocuments = originalMethods.studentCountDocuments;

  GithubStats.findOne = originalMethods.githubStatsFindOne;
  NormalizedContributionEvent.countDocuments = originalMethods.normalizedCountDocuments;
  WebhookIngestionEnvelope.countDocuments = originalMethods.envelopesCountDocuments;
}

function createLeaderboardQueryChain(rows) {
  return {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    async lean() {
      return rows;
    },
  };
}

function setupTestApp() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'this_is_a_test_jwt_secret_12345';
  process.env.ADMIN_API_KEY = 'test-admin-key';
  process.env.SYNC_COOLDOWN_MINUTES = '30';

  try {
    redis.disconnect();
  } catch (error) {
    // Ignore disconnect errors in tests.
  }

  const cache = new Map();

  redis.get = async (key) => (cache.has(key) ? cache.get(key) : null);
  redis.setex = async (key, _ttl, value) => {
    cache.set(key, value);
    return 'OK';
  };
  redis.set = async (key, value, _ex, _ttl, nxFlag) => {
    if (nxFlag === 'NX' && cache.has(key)) {
      return null;
    }
    cache.set(key, value);
    return 'OK';
  };
  redis.del = async (keys) => {
    if (Array.isArray(keys)) {
      let deleted = 0;
      for (const key of keys) {
        if (cache.delete(key)) deleted += 1;
      }
      return deleted;
    }
    return cache.delete(keys) ? 1 : 0;
  };
  redis.keys = async (pattern) => {
    const prefix = pattern.replace('*', '');
    return Array.from(cache.keys()).filter((key) => key.startsWith(prefix));
  };
  redis.ping = async () => 'PONG';

  const now = Date.now();
  const mockStudent = {
    _id: 'stu-auth-1',
    name: 'Contract User',
    email: 'contract.user@mitsgwl.ac.in',
    enrollmentId: '24CS10CT01',
    branch: 'CSE',
    year: 2,
    githubConnected: true,
    githubUsername: 'contract-user',
    score: 880,
    tierRank: 'Silver',
    leaderboardRank: 7,
    lastSyncedAt: new Date(now - 2 * 60 * 60 * 1000),
  };

  Student.findById = async () => mockStudent;
  GithubStats.findOne = async () => ({ fromCache: false });

  Student.find = () =>
    createLeaderboardQueryChain([
      {
        _id: 'stu-auth-1',
        name: 'Contract User',
        enrollmentId: '24CS10CT01',
        branch: 'CSE',
        year: 2,
        score: 880,
        tierRank: 'Silver',
        leaderboardRank: 7,
        avatar: null,
        githubUsername: 'contract-user',
      },
    ]);

  Student.countDocuments = async () => 1;
  NormalizedContributionEvent.countDocuments = async () => 0;
  WebhookIngestionEnvelope.countDocuments = async () => 0;

  const app = express();
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );

  app.use('/auth', authRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/security', securityRoutes);

  const token = jsonwebtoken.sign(
    {
      id: mockStudent._id,
      email: mockStudent.email,
      enrollmentId: mockStudent.enrollmentId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { app, token };
}

test('GET /auth/me returns authenticated student payload', async () => {
  const { app, token } = setupTestApp();

  try {
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.student.enrollmentId, '24CS10CT01');
    assert.equal(response.body.student.email, 'contract.user@mitsgwl.ac.in');
  } finally {
    restorePatchedMethods();
  }
});

test('GET /api/sync/status returns cooldown contract fields', async () => {
  const { app, token } = setupTestApp();

  try {
    const response = await request(app)
      .get('/api/sync/status')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(typeof response.body.canSync, 'boolean');
    assert.ok('lastSyncedAt' in response.body);
    assert.ok('nextAllowedAt' in response.body);
    assert.ok('score' in response.body);
    assert.ok('tierRank' in response.body);
  } finally {
    restorePatchedMethods();
  }
});

test('GET /api/leaderboard returns paginated response contract', async () => {
  const { app } = setupTestApp();

  try {
    const response = await request(app).get('/api/leaderboard?page=1&limit=20');

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.students));
    assert.equal(response.body.students.length, 1);
    assert.equal(response.body.students[0].displayRank, 1);

    assert.equal(response.body.pagination.page, 1);
    assert.equal(response.body.pagination.limit, 20);
    assert.equal(response.body.pagination.total, 1);
    assert.equal(response.body.pagination.totalPages, 1);
  } finally {
    restorePatchedMethods();
  }
});

test('GET /api/security/threat-model requires valid admin key', async () => {
  const { app, token } = setupTestApp();

  try {
    const forbidden = await request(app)
      .get('/api/security/threat-model')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.code, 'ADMIN_FORBIDDEN');

    const allowed = await request(app)
      .get('/api/security/threat-model')
      .set('Authorization', `Bearer ${token}`)
      .set('x-admin-key', 'test-admin-key');

    assert.equal(allowed.status, 200);
    assert.ok(Array.isArray(allowed.body.mitigations));
    assert.ok(allowed.body.mitigations.length > 0);
  } finally {
    restorePatchedMethods();
  }
});

test.after(() => {
  try {
    redis.disconnect();
  } catch (error) {
    // Ignore disconnect errors in tests.
  }
});
