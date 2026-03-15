/**
 * Score engine — calculates total score with hard caps and logarithmic scaling.
 * Prevents score inflation per Section 7 spec.
 */

function calculateScore(data) {
  // Hard caps — applied before multiplication
  const CAPS = {
    commits: Math.min(data.commits || 0, 5000),
    contributionsLast30Days: Math.min(data.contributionsLast30Days || 0, 300),
    streakDays: Math.min(data.streakDays || 0, 365),
    prsOpened: Math.min(data.prsOpened || 0, 200),
    prsMerged: Math.min(data.prsMergedExternal || 0, 150),
    issues: Math.min(data.issues || 0, 300),
    codeReviews: Math.min(data.codeReviews || 0, 200),
    repos: Math.min(data.meaningfulRepoCount || 0, 50),
    // Stars: logarithmic — 100 stars ≈ 46pts, 1000 ≈ 69pts, 10000 ≈ 92pts
    stars: Math.round(Math.log1p(data.stars || 0) * 10),
    // Forks: same logarithmic scale
    forks: Math.round(Math.log1p(data.forks || 0) * 10),
    watchers: Math.min(data.watchers || 0, 500),
    followers: Math.min(data.followers || 0, 2000),
    languages: Math.min(data.languageCount || 0, 20),
  };

  // Productivity & Activity Score
  const PAS =
    CAPS.commits * 1 +
    CAPS.contributionsLast30Days * 2 +
    CAPS.streakDays * 1;

  // Open-source Collaboration Score
  const OCS =
    CAPS.prsOpened * 5 +
    CAPS.prsMerged * 15 +
    CAPS.issues * 8 +
    CAPS.codeReviews * 4;

  // Project Impact Score
  const PIS =
    CAPS.repos * 5 +
    CAPS.stars + // already weighted by log scaling
    CAPS.forks + // already weighted by log scaling
    CAPS.watchers * 2;

  // Community Influence Score
  const CIS = CAPS.followers * 2;

  // Skill Diversity Score
  const SDS = CAPS.languages * 10;

  const rawTotal = PAS + OCS + PIS + CIS + SDS;
  const total = Math.min(rawTotal, 14999);

  return {
    total,
    breakdown: { PAS, OCS, PIS, CIS, SDS },
    capsApplied: CAPS,
  };
}

export { calculateScore };
