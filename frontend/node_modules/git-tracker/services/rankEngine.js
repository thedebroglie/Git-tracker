import Student from '../models/Student.js';

/**
 * Tier classification — recalibrated for v2 with caps.
 */
function getTier(score) {
  if (score < 500) return 'Bronze';
  if (score < 2000) return 'Silver';
  if (score < 5000) return 'Gold';
  if (score < 10000) return 'Platinum';
  return 'Elite';
}

/**
 * Rank calculation — O(1) lookup using indexed countDocuments.
 * Returns 1-based rank (rank 1 = highest score).
 */
async function calculateRank(currentScore, excludeStudentId) {
  const count = await Student.countDocuments({
    score: { $gt: currentScore },
    _id: { $ne: excludeStudentId },
  });
  return count + 1;
}

export { getTier, calculateRank };
