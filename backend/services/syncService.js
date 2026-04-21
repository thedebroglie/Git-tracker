import Student from '../models/Student.js';
import GithubStats from '../models/GithubStats.js';
import { fetchGithubStats, invalidateCache } from './githubService.js';
import { analyze } from './antiCheatService.js';
import { calculateScore } from './scoreEngine.js';
import { getTier, calculateRank } from './rankEngine.js';
import { invalidateLeaderboardCache } from './leaderboardCacheService.js';

/**
 * Full 12-step sync pipeline for a single student.
 * Called by the BullMQ worker — never from the API server directly.
 *
 * @param {string} studentId — MongoDB _id of the student
 * @param {object} options — { skipCooldown: false } for nightly sync
 */
function createSyncStudent(deps = {}) {
  const {
    StudentModel = Student,
    GithubStatsModel = GithubStats,
    fetchGithubStatsFn = fetchGithubStats,
    invalidateCacheFn = invalidateCache,
    analyzeFn = analyze,
    calculateScoreFn = calculateScore,
    getTierFn = getTier,
    calculateRankFn = calculateRank,
    invalidateLeaderboardCacheFn = invalidateLeaderboardCache,
    now = () => new Date(),
    nowMs = () => Date.now(),
  } = deps;

  return async function syncStudent(studentId, options = {}) {
    const { skipCooldown = false } = options;

    // Step 1: Find student, verify GitHub connected
    const student = await StudentModel.findById(studentId).select('+githubAccessToken');
    if (!student) throw new Error(`Student not found: ${studentId}`);
    if (!student.githubConnected || !student.githubUsername) {
      throw new Error(`Student ${student.name} has not connected GitHub`);
    }

    // Step 2: Check cooldown (skip for nightly batch)
    if (!skipCooldown && student.lastSyncedAt) {
      const cooldownMs =
        (parseInt(process.env.SYNC_COOLDOWN_MINUTES) || 30) * 60 * 1000;
      const elapsed = nowMs() - new Date(student.lastSyncedAt).getTime();

      if (elapsed < cooldownMs) {
        const nextAllowedAt = new Date(
          new Date(student.lastSyncedAt).getTime() + cooldownMs
        );
        throw new Error(
          JSON.stringify({
            error: 'Cooldown active',
            nextAllowedAt,
            remainingSeconds: Math.ceil((cooldownMs - elapsed) / 1000),
          })
        );
      }
    }

    console.log(`[Sync] Starting sync for ${student.githubUsername}`);

    // Step 3: Invalidate Redis cache for fresh data
    await invalidateCacheFn(student.githubUsername);

    // Step 4: Fetch GitHub stats via GraphQL (will cache result)
    const rawStats = await fetchGithubStatsFn(student.githubUsername, student.githubAccessToken);

    // Step 5: Anti-cheat analysis
    const { cleanedStats, flags, isFlagged } = analyzeFn(
      rawStats,
      student.githubUsername
    );

    // Step 6: Calculate score using cleaned (post-anti-cheat) stats
    const {
      total,
      breakdown,
      capsApplied,
      effectiveCommits,
      qualityScore,
      qualityBreakdown,
      daysSinceActivity,
      decayFactor,
      scoreVersion,
    } = calculateScoreFn(cleanedStats, { lastActiveAt: student.lastSyncedAt });

    // Step 7: Determine tier
    const tier = getTierFn(total);

    // Step 8: Calculate leaderboard rank
    const rank = await calculateRankFn(total, student._id);

    // Step 9: Upsert GithubStats document
    await GithubStatsModel.findOneAndUpdate(
      { userId: student._id },
      {
        userId: student._id,
        commits: cleanedStats.commits,
        contributionsLast30Days: cleanedStats.contributionsLast30Days,
        streakDays: cleanedStats.streakDays,
        prsOpened: cleanedStats.prsOpened,
        prsMergedExternal: cleanedStats.prsMergedExternal,
        prsMergedTotal: cleanedStats.prsMergedTotal,
        issues: cleanedStats.issues,
        codeReviews: cleanedStats.codeReviews,
        meaningfulRepoCount: cleanedStats.meaningfulRepoCount,
        totalRepoCount: cleanedStats.totalRepoCount,
        emptyRepoCount: cleanedStats.emptyRepoCount,
        stars: cleanedStats.stars,
        forks: cleanedStats.forks,
        watchers: cleanedStats.watchers,
        languageCount: cleanedStats.languageCount,
        languageList: cleanedStats.languageList,
        selfPRPercentage: cleanedStats.selfPRPercentage,
        scoreBreakdown: breakdown,
        capsApplied,
        effectiveCommits,
        qualityScore,
        qualityBreakdown,
        daysSinceActivity,
        decayFactor,
        scoreVersion,
        fromCache: rawStats.fromCache,
      },
      { upsert: true, new: true }
    );

    // Step 10: Append rank snapshot to history, trim to last 52
    const rankEntry = {
      rank,
      score: total,
      recordedAt: now(),
    };

    let rankHistory = student.rankHistory || [];
    rankHistory.push(rankEntry);
    if (rankHistory.length > 52) {
      rankHistory = rankHistory.slice(rankHistory.length - 52);
    }

    // Step 11: Update Student document
    await StudentModel.findByIdAndUpdate(student._id, {
      score: total,
      tierRank: tier,
      leaderboardRank: rank,
      lastSyncedAt: now(),
      antiCheatFlags: flags,
      isFlagged,
      followers: cleanedStats.followers,
      publicRepos: cleanedStats.totalRepoCount,
      avatar: cleanedStats.avatar || student.avatar,
      bio: cleanedStats.bio || student.bio,
      rankHistory,
      antiCheatReview: isFlagged
        ? { status: 'pending' }
        : {
            status: 'reviewed',
            reviewedBy: 'system',
            note: 'Auto-cleared because no active anti-cheat flags in latest sync.',
            reviewedAt: now(),
          },
    });

    // Keep leaderboard and cohort views coherent immediately after score updates.
    await invalidateLeaderboardCacheFn();

    console.log(
      `[Sync] Completed for ${student.githubUsername}: score=${total}, tier=${tier}, rank=${rank}`
    );

    // Step 12: Return complete result
    return {
      studentId: student._id,
      githubUsername: student.githubUsername,
      score: total,
      tier,
      rank,
      breakdown,
      effectiveCommits,
      qualityScore,
      qualityBreakdown,
      daysSinceActivity,
      decayFactor,
      scoreVersion,
      flags,
      isFlagged,
      fromCache: rawStats.fromCache,
      syncedAt: now(),
    };
  };
}

const syncStudent = createSyncStudent();

export { syncStudent, createSyncStudent };
