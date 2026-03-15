import { Router } from 'express';
import Student from '../models/Student.js';
import GithubStats from '../models/GithubStats.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// ─── GET /api/student/profile — Full profile with stats ───
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    const stats = await GithubStats.findOne({ userId: req.user._id });

    return res.json({
      student,
      stats: stats || null,
    });
  } catch (error) {
    console.error('Profile error:', error.message);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ─── GET /api/student/sync-status — Cooldown info ───
router.get('/sync-status', authMiddleware, async (req, res) => {
  try {
    const student = req.user;
    const cooldownMs =
      (parseInt(process.env.SYNC_COOLDOWN_MINUTES) || 30) * 60 * 1000;

    const canSync =
      !student.lastSyncedAt ||
      Date.now() - new Date(student.lastSyncedAt).getTime() >= cooldownMs;

    const nextAllowedAt = student.lastSyncedAt
      ? new Date(new Date(student.lastSyncedAt).getTime() + cooldownMs)
      : null;

    return res.json({
      lastSyncedAt: student.lastSyncedAt,
      nextAllowedAt,
      canSync,
    });
  } catch (error) {
    console.error('Sync status error:', error.message);
    return res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// ─── PATCH /api/student/github-url — Re-connect GitHub (Gap 4 fix) ───
router.patch('/github-url', authMiddleware, async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.user._id, {
      githubConnected: false,
      githubUsername: null,
      githubId: null,
      githubAccessToken: null,
      avatar: null,
      bio: null,
    });

    return res.json({
      message:
        'GitHub disconnected. Please reconnect using the OAuth flow.',
      githubConnected: false,
    });
  } catch (error) {
    console.error('GitHub disconnect error:', error.message);
    return res.status(500).json({ error: 'Failed to disconnect GitHub' });
  }
});

// ─── GET /api/student/:enrollmentId — Public profile ───
router.get('/:enrollmentId', async (req, res) => {
  try {
    const student = await Student.findOne({
      enrollmentId: req.params.enrollmentId.toUpperCase(),
    }).select(
      '-email -antiCheatFlags -isFlagged -githubAccessToken -passwordHash -rankHistory'
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const stats = await GithubStats.findOne({ userId: student._id }).select(
      '-capsApplied -selfPRPercentage -emptyRepoCount'
    );

    return res.json({
      student,
      stats: stats || null,
    });
  } catch (error) {
    console.error('Public profile error:', error.message);
    return res.status(500).json({ error: 'Failed to load student profile' });
  }
});

export default router;
