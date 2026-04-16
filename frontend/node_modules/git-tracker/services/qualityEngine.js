function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Contribution Quality Engine (CQE)
 * Produces a quality score in [0,1] using available metadata signals.
 */
function calculateContributionQuality(stats) {
  const commits = stats.commits || 0;
  const contributionsLast30Days = stats.contributionsLast30Days || 0;
  const languageCount = stats.languageCount || 0;
  const meaningfulRepoCount = stats.meaningfulRepoCount || 0;
  const prsOpened = stats.prsOpened || 0;
  const prsMergedExternal = stats.prsMergedExternal || 0;
  const selfPRPercentage = stats.selfPRPercentage || 0;
  const emptyRepoCount = stats.emptyRepoCount || 0;

  // Proxy for sustained coding output (no source-code retention required).
  const volumeScore = clamp((commits + contributionsLast30Days) / 1200, 0, 1);

  // Diversity proxy from language spread and meaningful repository spread.
  const diversityScore = clamp(
    ((languageCount / 10) + (meaningfulRepoCount / 20)) / 2,
    0,
    1
  );

  // PR quality proxy based on externally merged ratio.
  const prAssociationScore = prsOpened > 0
    ? clamp(prsMergedExternal / prsOpened, 0, 1)
    : 0.5;

  // Penalize suspicious contribution patterns.
  const selfPrPenalty = clamp(selfPRPercentage / 100, 0, 1);
  const emptyRepoPenalty = clamp(emptyRepoCount / 25, 0, 1);
  const antiSpamScore = clamp(1 - ((selfPrPenalty * 0.7) + (emptyRepoPenalty * 0.3)), 0, 1);

  const weights = {
    volume: 0.30,
    diversity: 0.25,
    prAssociation: 0.25,
    antiSpam: 0.20,
  };

  const qualityScore = clamp(
    (volumeScore * weights.volume) +
      (diversityScore * weights.diversity) +
      (prAssociationScore * weights.prAssociation) +
      (antiSpamScore * weights.antiSpam),
    0,
    1
  );

  return {
    qualityScore: Number(qualityScore.toFixed(4)),
    qualityBreakdown: {
      volumeScore: Number(volumeScore.toFixed(4)),
      diversityScore: Number(diversityScore.toFixed(4)),
      prAssociationScore: Number(prAssociationScore.toFixed(4)),
      antiSpamScore: Number(antiSpamScore.toFixed(4)),
      weights,
    },
  };
}

export { calculateContributionQuality };
