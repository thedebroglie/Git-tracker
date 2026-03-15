/**
 * Anti-cheat service — 5 detection rules run after data fetching, before scoring.
 * Flagged students are NOT banned — only marked for admin review.
 */

function analyze(stats, username) {
  const flags = [];
  const cleanedStats = { ...stats };

  // ─── Rule 1: Empty Repo Spam ───
  if (stats.emptyRepoCount > 20) {
    flags.push('REPO_SPAM');
    console.warn(
      `[AntiCheat] ${username}: REPO_SPAM — ${stats.emptyRepoCount} empty repos`
    );
  }
  // meaningfulRepoCount is already filtered in githubService, no adjustment needed.

  // ─── Rule 2: Activity Burst ───
  // Check contribution calendar for any single day with > 200 contributions.
  const calendar = stats.contributionCalendar || [];
  const burstDay = calendar.find((day) => day.contributionCount > 200);
  if (burstDay) {
    flags.push('ACTIVITY_BURST');
    console.warn(
      `[AntiCheat] ${username}: ACTIVITY_BURST — ${burstDay.contributionCount} contributions on ${burstDay.date}`
    );
  }

  // ─── Rule 3: PR Farm Detection ───
  if (stats.prsOpened > 50 && stats.prsMergedExternal < 5) {
    flags.push('PR_FARM');
    console.warn(
      `[AntiCheat] ${username}: PR_FARM — ${stats.prsOpened} PRs opened, only ${stats.prsMergedExternal} merged externally`
    );
  }

  // ─── Rule 4: Star Bot Detection ───
  if (stats.stars > 500 && stats.followers < 50) {
    flags.push('STAR_BOT_SUSPECTED');
    console.warn(
      `[AntiCheat] ${username}: STAR_BOT_SUSPECTED — ${stats.stars} stars but only ${stats.followers} followers`
    );
  }

  // ─── Rule 5: Self-PR Inflation ───
  if (stats.selfPRPercentage > 80 && stats.prsOpened > 10) {
    flags.push('SELF_PR_INFLATION');
    console.warn(
      `[AntiCheat] ${username}: SELF_PR_INFLATION — ${stats.selfPRPercentage}% self-PRs`
    );
  }

  return {
    flags,
    isFlagged: flags.length > 0,
    cleanedStats,
  };
}

export { analyze };
