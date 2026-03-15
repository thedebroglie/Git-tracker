import { Router } from 'express';
import Student from '../models/Student.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// ─── GET /api/leaderboard — Public, paginated, filterable ───
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      branch,
      year,
      tier,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};
    if (branch) filter.branch = branch.toUpperCase();
    if (year) filter.year = parseInt(year);
    if (tier) filter.tierRank = tier;

    // Only show students who have synced at least once
    filter.score = { $gt: 0 };

    const [students, total] = await Promise.all([
      Student.find(filter)
        .select(
          'name enrollmentId branch year score tierRank leaderboardRank avatar githubUsername'
        )
        .sort({ score: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(filter),
    ]);

    // Compute display rank based on position in sorted results
    const ranked = students.map((student, idx) => ({
      ...student,
      displayRank: skip + idx + 1,
    }));

    return res.json({
      students: ranked,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error.message);
    return res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ─── GET /api/leaderboard/my-position — Student's rank ± 2 ───
router.get('/my-position', authMiddleware, async (req, res) => {
  try {
    const student = req.user;

    if (!student.score || student.score === 0) {
      return res.json({
        myRank: null,
        message: 'Sync your GitHub profile first to appear on the leaderboard',
        neighbors: [],
      });
    }

    // Get students ranked above (2) and below (2)
    const [above, below] = await Promise.all([
      Student.find({
        score: { $gt: student.score },
        _id: { $ne: student._id },
      })
        .select('name enrollmentId branch score tierRank avatar githubUsername')
        .sort({ score: 1 })
        .limit(2)
        .lean(),
      Student.find({
        score: { $lt: student.score },
        _id: { $ne: student._id },
      })
        .select('name enrollmentId branch score tierRank avatar githubUsername')
        .sort({ score: -1 })
        .limit(2)
        .lean(),
    ]);

    // Calculate ranks for neighbors
    const myRank = student.leaderboardRank;

    const neighbors = [
      ...above.reverse().map((s, i) => ({
        ...s,
        rank: myRank - (above.length - i),
      })),
      {
        _id: student._id,
        name: student.name,
        enrollmentId: student.enrollmentId,
        branch: student.branch,
        score: student.score,
        tierRank: student.tierRank,
        avatar: student.avatar,
        githubUsername: student.githubUsername,
        rank: myRank,
        isMe: true,
      },
      ...below.map((s, i) => ({
        ...s,
        rank: myRank + i + 1,
      })),
    ];

    return res.json({
      myRank,
      myScore: student.score,
      myTier: student.tierRank,
      neighbors,
    });
  } catch (error) {
    console.error('My position error:', error.message);
    return res.status(500).json({ error: 'Failed to get leaderboard position' });
  }
});

export default router;
