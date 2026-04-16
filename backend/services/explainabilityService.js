const FLAG_REASON_MAP = {
  REPO_SPAM: 'High empty repository count indicates potential low-value repository spam.',
  ACTIVITY_BURST: 'Single-day contribution burst exceeded expected organic activity thresholds.',
  PR_FARM: 'High PR open count with low external merge rate suggests PR farming behavior.',
  STAR_BOT_SUSPECTED: 'Star count is unusually high relative to follower count.',
  SELF_PR_INFLATION: 'Very high self-PR percentage suggests low external collaboration quality.',
};

function buildFlagDetails(flags = []) {
  return flags.map((flag) => ({
    code: flag,
    reason: FLAG_REASON_MAP[flag] || 'Flag reason not yet mapped.',
  }));
}

function round(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Number(value.toFixed(4));
}

function buildScoreExplanation(student, stats, options = {}) {
  const { includeFlags = true } = options;

  if (!student || !stats) {
    return {
      available: false,
      message: 'No synchronized scoring data is available yet.',
    };
  }

  const breakdown = stats.scoreBreakdown || {};
  const pas = breakdown.PAS || 0;
  const ocs = breakdown.OCS || 0;
  const pis = breakdown.PIS || 0;
  const cis = breakdown.CIS || 0;
  const sds = breakdown.SDS || 0;
  const rawTotal = pas + ocs + pis + cis + sds;
  const decayFactor = typeof stats.decayFactor === 'number' ? stats.decayFactor : 1;
  const totalAfterDecay = Math.round(rawTotal * decayFactor);

  const formula = {
    effectiveCommits: stats.effectiveCommits || 0,
    qualityScore: round(stats.qualityScore || 0),
    qualityBreakdown: stats.qualityBreakdown || {},
    decay: {
      daysSinceActivity: stats.daysSinceActivity || 0,
      decayFactor: round(decayFactor),
      expression: 'decay_factor = 1 / log(days_since + 2) with safety clamp',
    },
    components: {
      PAS: pas,
      OCS: ocs,
      PIS: pis,
      CIS: cis,
      SDS: sds,
    },
    rawTotal,
    totalAfterDecay,
    totalScore: student.score,
    scoreVersion: stats.scoreVersion || 'unknown',
  };

  return {
    available: true,
    student: {
      id: student._id,
      name: student.name,
      enrollmentId: student.enrollmentId,
      githubUsername: student.githubUsername || null,
    },
    rank: {
      leaderboardRank: student.leaderboardRank,
      tierRank: student.tierRank,
      score: student.score,
      lastSyncedAt: student.lastSyncedAt || null,
    },
    formula,
    capsApplied: stats.capsApplied || {},
    antiCheat: includeFlags
      ? {
          isFlagged: student.isFlagged,
          flags: buildFlagDetails(student.antiCheatFlags || []),
        }
      : {
          isFlagged: student.isFlagged,
          flags: [],
        },
    transparency: {
      fromCache: Boolean(stats.fromCache),
      source: 'GitHub metadata only (no source code storage)',
    },
  };
}

export { buildScoreExplanation };
