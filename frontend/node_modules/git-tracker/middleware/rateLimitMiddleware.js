import Student from '../models/Student.js';

/**
 * Sync cooldown middleware — enforces SYNC_COOLDOWN_MINUTES between manual syncs.
 * Attach this to POST /api/sync.
 */
const syncCooldownMiddleware = async (req, res, next) => {
  try {
    const student = req.user;
    const cooldownMinutes = parseInt(process.env.SYNC_COOLDOWN_MINUTES) || 30;

    if (student.lastSyncedAt) {
      const elapsed = Date.now() - new Date(student.lastSyncedAt).getTime();
      const cooldownMs = cooldownMinutes * 60 * 1000;

      if (elapsed < cooldownMs) {
        const nextAllowedAt = new Date(
          new Date(student.lastSyncedAt).getTime() + cooldownMs
        );
        return res.status(429).json({
          error: 'Sync cooldown active',
          lastSyncedAt: student.lastSyncedAt,
          nextAllowedAt,
          remainingSeconds: Math.ceil((cooldownMs - elapsed) / 1000),
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Rate limit check failed.' });
  }
};

export default syncCooldownMiddleware;
