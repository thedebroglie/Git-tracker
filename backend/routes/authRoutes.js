import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import axios from 'axios';
import Student from '../models/Student.js';
import { redis } from '../config/redis.js';
import authMiddleware from '../middleware/authMiddleware.js';

const { sign, verify } = jsonwebtoken;
const router = Router();

// ─── POST /auth/register ───
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check email in seed list (students collection)
    const student = await Student.findOne({ email: normalizedEmail });
    if (!student) {
      return res
        .status(401)
        .json({ error: 'Email not found in institute records' });
    }

    // Check if already registered
    const existingStudent = await Student.findOne({
      email: normalizedEmail,
    }).select('+passwordHash');
    if (existingStudent && existingStudent.passwordHash) {
      return res
        .status(409)
        .json({ error: 'Account already registered. Please log in.' });
    }

    // Hash password and save
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    student.passwordHash = passwordHash;
    await student.save();

    // Generate JWT
    const token = sign(
      { id: student._id, email: student.email, enrollmentId: student.enrollmentId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        enrollmentId: student.enrollmentId,
        branch: student.branch,
        year: student.year,
        githubConnected: student.githubConnected,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /auth/login ───
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail }).select(
      '+passwordHash'
    );

    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!student.passwordHash) {
      return res
        .status(401)
        .json({ error: 'Account not registered yet. Please register first.' });
    }

    const isMatch = await bcrypt.compare(password, student.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = sign(
      { id: student._id, email: student.email, enrollmentId: student.enrollmentId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        enrollmentId: student.enrollmentId,
        branch: student.branch,
        year: student.year,
        githubConnected: student.githubConnected,
        tierRank: student.tierRank,
        score: student.score,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /auth/github — Generate OAuth URL with CSRF state ───
router.get('/github', authMiddleware, async (req, res) => {
  try {
    // Generate random state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in Redis with 10-minute TTL (Gap 2 fix)
    await redis.setex(`oauth:state:${state}`, 600, req.user._id.toString());

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      scope: 'read:user',
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return res.json({ authUrl });
  } catch (error) {
    console.error('GitHub OAuth URL error:', error.message);
    return res.status(500).json({ error: 'Failed to generate GitHub auth URL' });
  }
});

// ─── GET /auth/github/callback — OAuth callback ───
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=missing_params`
      );
    }

    // Verify state exists in Redis (CSRF check — Gap 2)
    const storedUserId = await redis.get(`oauth:state:${state}`);
    if (!storedUserId) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=invalid_state`
      );
    }

    // Delete the state token — one-time use
    await redis.del(`oauth:state:${state}`);

    // Exchange code for access_token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=token_exchange_failed`
      );
    }

    // Call GitHub API to get verified identity
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const githubUser = userResponse.data;

    // Save verified GitHub identity to student record
    await Student.findByIdAndUpdate(storedUserId, {
      githubUsername: githubUser.login,
      githubId: githubUser.id.toString(),
      githubConnected: true,
      avatar: githubUser.avatar_url,
      bio: githubUser.bio || '',
      githubAccessToken: access_token,
    });

    console.log(
      `GitHub connected: Student ${storedUserId} → ${githubUser.login}`
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard?github=connected`
    );
  } catch (error) {
    console.error('GitHub callback error:', error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/github-connect?error=callback_failed`
    );
  }
});

// ─── GET /auth/me — Current student profile ───
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);
    return res.json({ student });
  } catch (error) {
    console.error('Get profile error:', error.message);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

// ─── POST /auth/logout ───
router.post('/logout', authMiddleware, async (req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

export default router;
