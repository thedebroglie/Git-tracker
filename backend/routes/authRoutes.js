import { Router } from 'express';
import crypto from 'crypto';
import jsonwebtoken from 'jsonwebtoken';
import axios from 'axios';
import Student from '../models/Student.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { setWithTTL, getValue, deleteKey } from '../utils/ephemeralStore.js';
import { linkGithubIdentity } from '../services/identityMappingService.js';
import { createRequestRateLimiter } from '../middleware/requestRateLimitMiddleware.js';

const { sign } = jsonwebtoken;
const router = Router();

const oauthUrlLimiter = createRequestRateLimiter({
  keyPrefix: 'rl:auth:oauth_url',
  windowSeconds: 60,
  maxRequests: 20,
  identity: 'user',
});

const googleOAuthLimiter = createRequestRateLimiter({
  keyPrefix: 'rl:auth:google_oauth',
  windowSeconds: 60,
  maxRequests: 20,
  identity: 'ip',
});

// ─── GET /auth/github — Generate OAuth URL with CSRF state ───
router.get('/github', authMiddleware, oauthUrlLimiter, async (req, res) => {
  try {
    const githubClientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_CLIENT_ID;
    const githubCallbackUrl = process.env.GITHUB_CALLBACK_URL || process.env.GITHUB_APP_CALLBACK_URL;

    if (!githubClientId || !githubCallbackUrl) {
      return res.status(500).json({
        error:
          'GitHub auth is not configured. Set GITHUB_CLIENT_ID (or GITHUB_APP_CLIENT_ID) and GITHUB_CALLBACK_URL (or GITHUB_APP_CALLBACK_URL).',
      });
    }

    // Generate random state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in Redis with 10-minute TTL (Gap 2 fix)
    await setWithTTL(`oauth:state:${state}`, req.user._id.toString(), 600);

    const params = new URLSearchParams({
      client_id: githubClientId,
      scope: 'read:user',
      redirect_uri: githubCallbackUrl,
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return res.json({ authUrl });
  } catch (error) {
    console.error('GitHub OAuth URL error:', error.message);
    return res.status(500).json({ error: 'Failed to generate GitHub auth URL' });
  }
});

// ─── GET /auth/google — Generate Google OAuth URL with CSRF state ───
router.get('/google', googleOAuthLimiter, async (req, res) => {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

    if (!googleClientId || !googleCallbackUrl) {
      return res.status(500).json({
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CALLBACK_URL.',
      });
    }

    const state = crypto.randomBytes(32).toString('hex');
    await setWithTTL(`google:state:${state}`, 'pending', 600);

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleCallbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
      access_type: 'online',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return res.json({ authUrl });
  } catch (error) {
    console.error('Google OAuth URL error:', error.message);
    return res.status(500).json({ error: 'Failed to generate Google auth URL' });
  }
});

// ─── GET /auth/github/app/install — Generate GitHub App install URL ───
router.get('/github/app/install', authMiddleware, oauthUrlLimiter, async (req, res) => {
  try {
    if (!process.env.GITHUB_APP_INSTALL_URL) {
      return res.status(500).json({
        error: 'GITHUB_APP_INSTALL_URL is not configured',
      });
    }

    const state = crypto.randomBytes(32).toString('hex');
    await setWithTTL(`app:install:state:${state}`, req.user._id.toString(), 600);

    const installUrl = new URL(process.env.GITHUB_APP_INSTALL_URL);
    installUrl.searchParams.set('state', state);

    return res.json({
      installUrl: installUrl.toString(),
    });
  } catch (error) {
    console.error('GitHub App install URL error:', error.message);
    return res.status(500).json({ error: 'Failed to generate GitHub App install URL' });
  }
});

// ─── GET /auth/github/app/callback — GitHub App install callback ───
router.get('/github/app/callback', async (req, res) => {
  try {
    const { installation_id: installationId, setup_action: setupAction, state } = req.query;

    if (!installationId || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=missing_installation_params`
      );
    }

    const storedUserId = await getValue(`app:install:state:${state}`);
    if (!storedUserId) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=invalid_installation_state`
      );
    }

    await deleteKey(`app:install:state:${state}`);

    await Student.findByIdAndUpdate(storedUserId, {
      githubAppInstalled: true,
      githubAppInstallationId: installationId.toString(),
      githubAppSetupAction: setupAction ? setupAction.toString() : 'install',
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard?github_app=installed`
    );
  } catch (error) {
    console.error('GitHub App callback error:', error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/github-connect?error=app_callback_failed`
    );
  }
});

// ─── GET /auth/google/callback — Google OAuth callback ───
router.get('/google/callback', async (req, res) => {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

    if (!googleClientId || !googleClientSecret || !googleCallbackUrl) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login/google/callback#error=google_oauth_not_configured`
      );
    }

    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login/google/callback#error=missing_params`
      );
    }

    const storedState = await getValue(`google:state:${state}`);
    if (!storedState) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login/google/callback#error=invalid_state`
      );
    }

    await deleteKey(`google:state:${state}`);

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleCallbackUrl,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const accessToken = tokenResponse.data?.access_token;
    if (!accessToken) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login/google/callback#error=token_exchange_failed`
      );
    }

    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const googleUser = userResponse.data;
    const googleEmail = String(googleUser.email || '').toLowerCase().trim();

    if (!googleEmail) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login/google/callback#error=missing_google_email`
      );
    }

    if (!googleEmail.endsWith('@mitsgwl.ac.in') && !googleEmail.endsWith('@mitsgwalior.in')) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login/google/callback#error=invalid_domain&email=${encodeURIComponent(googleEmail)}`
      );
    }

    let student = await Student.findOne({ email: googleEmail });
    if (!student) {
      const emailPrefix = googleEmail.split('@')[0];
      let branch = 'CSE';
      if (emailPrefix.includes('it')) branch = 'IT';
      else if (emailPrefix.includes('ec')) branch = 'ECE';
      else if (emailPrefix.includes('me')) branch = 'ME';
      else if (emailPrefix.includes('cv')) branch = 'CV';

      student = new Student({
        email: googleEmail,
        name: googleUser.name || emailPrefix,
        enrollmentId: emailPrefix.toUpperCase(),
        branch: branch,
        year: 1
      });
      await student.save();
    }

    const token = sign(
      { id: student._id, email: student.email, enrollmentId: student.enrollmentId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const payload = encodeURIComponent(
      JSON.stringify({
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
      })
    );

    return res.redirect(`${process.env.FRONTEND_URL}/login/google/callback#payload=${payload}`);
  } catch (error) {
    console.error('Google callback error:', error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/login/google/callback#error=callback_failed`
    );
  }
});

// ─── GET /auth/github/callback — OAuth callback ───
router.get('/github/callback', async (req, res) => {
  try {
    const githubClientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_CLIENT_ID;
    const githubClientSecret =
      process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_APP_CLIENT_SECRET;

    if (!githubClientId || !githubClientSecret) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=oauth_not_configured`
      );
    }

    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=missing_params`
      );
    }

    // Verify state exists in Redis (CSRF check — Gap 2)
    const storedUserId = await getValue(`oauth:state:${state}`);
    if (!storedUserId) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/github-connect?error=invalid_state`
      );
    }

    // Delete the state token — one-time use
    await deleteKey(`oauth:state:${state}`);

    // Exchange code for access_token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: githubClientId,
        client_secret: githubClientSecret,
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

    // Save verified GitHub identity to student record with username history safety.
    await linkGithubIdentity({
      studentId: storedUserId,
      githubUser,
      accessToken: access_token,
      source: 'oauth_callback',
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
