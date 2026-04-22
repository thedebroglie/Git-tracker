import { Router } from 'express';
import bcrypt from 'bcryptjs';
import Student from '../models/Student.js';
import GithubStats from '../models/GithubStats.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { buildScoreExplanation } from '../services/explainabilityService.js';
import {
  disconnectGithubIdentity,
  deleteStudentAccount,
} from '../services/identityMappingService.js';

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

// ─── PATCH /api/student/profile — Update profile ───
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, branch, semester, mobile, enrollmentId } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (branch) updates.branch = branch;
    if (semester) {
      updates.semester = parseInt(semester, 10);
      updates.year = Math.ceil(updates.semester / 2);
    }
    if (mobile !== undefined) updates.mobile = mobile;
    
    if (enrollmentId) {
      // Check if it already exists in another student
      const existing = await Student.findOne({ enrollmentId });
      if (existing && existing._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({ error: 'Enrollment ID already in use' });
      }
      updates.enrollmentId = enrollmentId;
    }

    const student = await Student.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.json({ student });
  } catch (error) {
    console.error('Profile update error:', error.message);
    return res.status(500).json({ error: 'Failed to update profile' });
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

// ─── GET /api/student/score-explanation — Explain own score ───
router.get('/score-explanation', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    const stats = await GithubStats.findOne({ userId: req.user._id });

    const explanation = buildScoreExplanation(student, stats, {
      includeFlags: true,
    });

    return res.json(explanation);
  } catch (error) {
    console.error('Score explanation error:', error.message);
    return res.status(500).json({ error: 'Failed to build score explanation' });
  }
});

// ─── PATCH /api/student/github-url — Re-connect GitHub (Gap 4 fix) ───
router.patch('/github-url', authMiddleware, async (req, res) => {
  try {
    await disconnectGithubIdentity(req.user._id);

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

// ─── POST /api/student/github/disconnect — Hardened disconnect flow ───
router.post('/github/disconnect', authMiddleware, async (req, res) => {
  try {
    const result = await disconnectGithubIdentity(req.user._id);

    return res.json({
      message: 'GitHub disconnected. Identity history has been preserved.',
      ...result,
    });
  } catch (error) {
    console.error('Hardened GitHub disconnect error:', error.message);
    return res.status(500).json({ error: 'Failed to disconnect GitHub identity' });
  }
});

// ─── DELETE /api/student/account — Account deletion and cleanup flow ───
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { password, confirmText } = req.body || {};

    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        error: 'confirmText must be exactly "DELETE MY ACCOUNT"',
      });
    }

    const student = await Student.findById(req.user._id).select('+passwordHash');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.passwordHash) {
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const isValid = await bcrypt.compare(password, student.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    const cleanup = await deleteStudentAccount(student._id);

    return res.json({
      message: 'Account deleted successfully',
      cleanup,
    });
  } catch (error) {
    console.error('Account deletion error:', error.message);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ─── GET /api/student/:enrollmentId/score-explanation — Public explanation ───
router.get('/:enrollmentId/score-explanation', async (req, res) => {
  try {
    const student = await Student.findOne({
      enrollmentId: req.params.enrollmentId.toUpperCase(),
    }).select('-email -githubAccessToken -passwordHash');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const stats = await GithubStats.findOne({ userId: student._id });
    const explanation = buildScoreExplanation(student, stats, {
      includeFlags: false,
    });

    return res.json(explanation);
  } catch (error) {
    console.error('Public score explanation error:', error.message);
    return res.status(500).json({ error: 'Failed to build public score explanation' });
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
