import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore, SCORE_ENGINE_VERSION } from '../services/scoreEngine.js';
import { calculateContributionQuality } from '../services/qualityEngine.js';
import { calculateDaysSince, calculateDecayFactor } from '../services/decayEngine.js';
import { analyze, explainFlags } from '../services/antiCheatService.js';

test('score engine keeps total under hard cap and reports version', () => {
  const result = calculateScore(
    {
      commits: 999999,
      contributionsLast30Days: 2000,
      streakDays: 1000,
      prsOpened: 999,
      prsMergedExternal: 999,
      issues: 999,
      codeReviews: 999,
      meaningfulRepoCount: 999,
      stars: 999999,
      forks: 999999,
      watchers: 999,
      followers: 999999,
      languageCount: 999,
      selfPRPercentage: 0,
      emptyRepoCount: 0,
    },
    { lastActiveAt: new Date() }
  );

  assert.ok(result.total <= 14999);
  assert.equal(result.scoreVersion, SCORE_ENGINE_VERSION);
  assert.ok(result.qualityScore >= 0 && result.qualityScore <= 1);
  assert.ok(result.decayFactor > 0 && result.decayFactor <= 1);
});

test('quality engine output stays within range and includes weighted breakdown', () => {
  const quality = calculateContributionQuality({
    commits: 300,
    contributionsLast30Days: 100,
    languageCount: 4,
    meaningfulRepoCount: 8,
    prsOpened: 20,
    prsMergedExternal: 10,
    selfPRPercentage: 30,
    emptyRepoCount: 2,
  });

  assert.ok(quality.qualityScore >= 0 && quality.qualityScore <= 1);
  assert.ok(typeof quality.qualityBreakdown.volumeScore === 'number');
  assert.ok(typeof quality.qualityBreakdown.weights === 'object');
});

test('decay engine applies safe clamp and day calculation', () => {
  const now = new Date();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  assert.equal(calculateDaysSince(now), 0);
  assert.ok(calculateDaysSince(tenDaysAgo) >= 9);

  const lowDecay = calculateDecayFactor(3650);
  const freshDecay = calculateDecayFactor(0);

  assert.ok(lowDecay.decayFactor >= 0.2);
  assert.ok(freshDecay.decayFactor <= 1);
});

test('anti-cheat analyzer flags suspicious patterns and maps reasons', () => {
  const input = {
    emptyRepoCount: 25,
    contributionCalendar: [{ date: '2026-01-01', contributionCount: 260 }],
    prsOpened: 60,
    prsMergedExternal: 2,
    stars: 800,
    followers: 20,
    selfPRPercentage: 91,
  };

  const result = analyze(input, 'phase10-user');
  assert.equal(result.isFlagged, true);
  assert.ok(result.flags.includes('REPO_SPAM'));
  assert.ok(result.flags.includes('ACTIVITY_BURST'));
  assert.ok(result.flags.includes('PR_FARM'));
  assert.ok(result.flags.includes('STAR_BOT_SUSPECTED'));
  assert.ok(result.flags.includes('SELF_PR_INFLATION'));

  const reasons = explainFlags(result.flags);
  assert.ok(reasons.length >= 5);
  assert.ok(reasons.every((item) => item.code && item.reason));
});
