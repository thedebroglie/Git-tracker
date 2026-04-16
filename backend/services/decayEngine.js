function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateDaysSince(lastActiveAt) {
  if (!lastActiveAt) return 0;
  const ms = Date.now() - new Date(lastActiveAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Decay engine per SRS: decay_factor = 1 / log(days_since + 2)
 * Clamped to [0.2, 1] so fresh activity is not boosted above baseline.
 */
function calculateDecayFactor(daysSinceActivity) {
  const days = Math.max(0, daysSinceActivity || 0);
  const raw = 1 / Math.log(days + 2);
  const decayFactor = clamp(raw, 0.2, 1);

  return {
    daysSinceActivity: days,
    decayFactor: Number(decayFactor.toFixed(4)),
  };
}

export { calculateDaysSince, calculateDecayFactor };
