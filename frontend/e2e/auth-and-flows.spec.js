import { test, expect } from '@playwright/test';

const student = {
  _id: 'student-1',
  enrollmentId: '24CS10NE83',
  name: 'E2E Student',
  email: '24cs10ne83@mitsgwl.ac.in',
  branch: 'CSE',
  year: 4,
  avatar: '',
  tierRank: 'Gold',
  leaderboardRank: 12,
  score: 4421,
  githubConnected: true,
  githubUsername: 'e2e-student',
  githubAppInstalled: true,
  githubAppInstallationId: '12345',
};

const stats = {
  scoreVersion: 'v4-cqe-decay-1',
  commits: 178,
  prsOpened: 24,
  prsMergedExternal: 15,
  issues: 11,
  codeReviews: 29,
  meaningfulRepoCount: 6,
  stars: 19,
  languageCount: 5,
  streakDays: 14,
  contributionsLast30Days: 52,
  qualityScore: 0.82,
  effectiveCommits: 132,
  daysSinceActivity: 1,
  decayFactor: 0.96,
  languageList: ['JavaScript', 'TypeScript', 'Python'],
};

const explanation = {
  available: true,
  formula: {
    scoreVersion: 'v4-cqe-decay-1',
    components: {
      PAS: 920,
      OCS: 1460,
      PIS: 410,
      CIS: 240,
      SDS: 30,
    },
    qualityBreakdown: {
      weights: {
        volume: 0.35,
        diversity: 0.25,
        prAssociation: 0.25,
        antiSpam: 0.15,
      },
      volumeScore: 0.88,
      diversityScore: 0.75,
      prAssociationScore: 0.81,
      antiSpamScore: 0.9,
    },
    qualityScore: 0.82,
    effectiveCommits: 132,
    rawTotal: 3060,
    totalAfterDecay: 2938,
    totalScore: 4421,
    decay: {
      daysSinceActivity: 1,
      decayFactor: 0.96,
      expression: 'decay = 1 / log(days + 2)',
    },
  },
  rank: {
    score: 4421,
    tierRank: 'Gold',
    leaderboardRank: 12,
  },
  antiCheat: {
    isFlagged: false,
    flags: [],
  },
  capsApplied: {},
  transparency: {
    source: 'Scores derived from GitHub metadata only.',
  },
};

const myPosition = {
  myRank: 12,
  myScore: 4421,
  myTier: 'Gold',
  neighbors: [
    { rank: 11, name: 'Peer Above', score: 4470, tierRank: 'Gold', isMe: false },
    { rank: 12, name: 'E2E Student', score: 4421, tierRank: 'Gold', isMe: true },
    { rank: 13, name: 'Peer Below', score: 4390, tierRank: 'Silver', isMe: false },
  ],
};

const leaderboard = {
  students: [
    {
      _id: 's-1',
      displayRank: 1,
      enrollmentId: '24CS10NE01',
      name: 'Top One',
      branch: 'CSE',
      year: 4,
      score: 5400,
      tierRank: 'Elite',
      avatar: '',
    },
    {
      _id: 's-2',
      displayRank: 2,
      enrollmentId: '24CS10NE02',
      name: 'Top Two',
      branch: 'CSE',
      year: 4,
      score: 5210,
      tierRank: 'Platinum',
      avatar: '',
    },
    {
      _id: 's-3',
      displayRank: 3,
      enrollmentId: '24CS10NE03',
      name: 'Top Three',
      branch: 'CSE',
      year: 4,
      score: 5005,
      tierRank: 'Gold',
      avatar: '',
    },
    {
      _id: 's-12',
      displayRank: 12,
      enrollmentId: '24CS10NE83',
      name: 'E2E Student',
      branch: 'CSE',
      year: 4,
      score: 4421,
      tierRank: 'Gold',
      avatar: '',
    },
  ],
  pagination: {
    page: 1,
    totalPages: 1,
    total: 4,
  },
};

function jsonResponse(data, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  };
}

async function seedAuthState(page) {
  await page.addInitScript((seed) => {
    window.localStorage.setItem('gt_token', seed.token);
    window.localStorage.setItem('gt_student', JSON.stringify(seed.student));
  }, { token: 'e2e-token', student });
}

async function mockAuthenticatedApis(page) {
  await page.route('**/auth/me', async (route) => {
    await route.fulfill(jsonResponse({ student }));
  });

  await page.route('**/api/student/profile', async (route) => {
    await route.fulfill(jsonResponse({ student, stats }));
  });

  await page.route('**/api/student/score-explanation', async (route) => {
    await route.fulfill(jsonResponse(explanation));
  });

  await page.route('**/api/sync/status', async (route) => {
    await route.fulfill(jsonResponse({
      canSync: true,
      lastSyncedAt: new Date().toISOString(),
      nextAllowedAt: new Date(Date.now() + 60000).toISOString(),
    }));
  });

  await page.route('**/api/sync', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill(jsonResponse({ message: 'Sync queued for processing.' }));
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/leaderboard/my-position', async (route) => {
    await route.fulfill(jsonResponse(myPosition));
  });

  await page.route('**/api/leaderboard**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/api/leaderboard')) {
      await route.fulfill(jsonResponse(leaderboard));
      return;
    }
    await route.fulfill(jsonResponse({ error: 'Not found' }, 404));
  });
}

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign In' }).first()).toBeVisible();
});

test('logs in and renders dashboard panels', async ({ page }) => {
  await mockAuthenticatedApis(page);

  await page.route('**/auth/login', async (route) => {
    await route.fulfill(jsonResponse({ token: 'e2e-token', student }));
  });

  await page.goto('/login');
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Total Score')).toBeVisible();
  await expect(page.getByText('GitHub Metrics')).toBeVisible();
  await expect(page.getByText('Quality Engine')).toBeVisible();
});

test('navigates protected pages and can trigger sync', async ({ page }) => {
  await mockAuthenticatedApis(page);
  await seedAuthState(page);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Welcome back,/ })).toBeVisible();

  await page.getByRole('link', { name: 'Leaderboard' }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  await expect(page.getByText('Top One')).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('GitHub Integration')).toBeVisible();

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('button', { name: /Sync Now/ }).click();
  await expect(page.getByText('Sync queued for processing.')).toBeVisible();
});
