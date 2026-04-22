import axios from 'axios';
import { redis } from '../config/redis.js';

const CACHE_TTL_SECONDS = 1800; // 30 minutes

// -------------------------------------------------------------------
// GraphQL query — fetches first page of repos (100 max per page).
// The pagination loop handles users with >100 repos.
// -------------------------------------------------------------------
const GITHUB_QUERY = `
  query ($login: String!, $repoAfter: String) {
    user(login: $login) {
      name
      bio
      avatarUrl
      followers { totalCount }
      following { totalCount }
      repositories(
        first: 100,
        after: $repoAfter,
        ownerAffiliations: OWNER,
        privacy: PUBLIC,
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          stargazerCount
          forkCount
          watchers { totalCount }
          diskUsage
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            nodes { name }
          }
          pullRequests(
            states: MERGED,
            orderBy: { field: CREATED_AT, direction: DESC }
          ) {
            totalCount
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
        pullRequestContributionsByRepository(maxRepositories: 100) {
          repository {
            owner { login }
          }
          contributions { totalCount }
        }
      }
    }
  }
`;

// -------------------------------------------------------------------
// Call GitHub GraphQL API with pagination for repositories.
// -------------------------------------------------------------------
async function fetchGithubGraphQL(username, userAccessToken = null) {
  const appToken = process.env.GITHUB_APP_TOKEN;
  let token = userAccessToken;
  if (!token && appToken && appToken !== 'local_placeholder') {
    token = appToken;
  }
  
  if (!token) throw new Error('No GitHub token available to fetch stats');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // First call — gets user profile + contributions + first page of repos
  let response = await axios.post(
    'https://api.github.com/graphql',
    { query: GITHUB_QUERY, variables: { login: username, repoAfter: null } },
    { headers }
  );

  if (response.data.errors) {
    throw new Error(
      `GitHub GraphQL error: ${response.data.errors[0].message}`
    );
  }

  const user = response.data.data.user;
  if (!user) throw new Error(`GitHub user not found: ${username}`);

  // Collect all repo nodes across pages
  let allRepoNodes = [...user.repositories.nodes];
  let pageInfo = user.repositories.pageInfo;

  // Pagination loop — Gap 3 fix
  while (pageInfo.hasNextPage) {
    const pageResponse = await axios.post(
      'https://api.github.com/graphql',
      {
        query: GITHUB_QUERY,
        variables: { login: username, repoAfter: pageInfo.endCursor },
      },
      { headers }
    );

    if (pageResponse.data.errors) {
      console.error(
        `GitHub pagination error for ${username}:`,
        pageResponse.data.errors[0].message
      );
      break;
    }

    const pageUser = pageResponse.data.data.user;
    if (!pageUser) break;

    allRepoNodes = allRepoNodes.concat(pageUser.repositories.nodes);
    pageInfo = pageUser.repositories.pageInfo;
  }

  return { user, allRepoNodes };
}

// -------------------------------------------------------------------
// Extract all 13 stats from the raw GraphQL response.
// -------------------------------------------------------------------
function extractStats(user, allRepoNodes, username) {
  const cc = user.contributionsCollection;

  // --- Commits, PRs, Issues, Reviews ---
  const commits = cc.totalCommitContributions || 0;
  const prsOpened = cc.totalPullRequestContributions || 0;
  const issues = cc.totalIssueContributions || 0;
  const codeReviews = cc.totalPullRequestReviewContributions || 0;

  // --- Followers ---
  const followers = user.followers?.totalCount || 0;

  // --- Repository aggregation ---
  let totalStars = 0;
  let totalForks = 0;
  let totalWatchers = 0;
  let meaningfulRepoCount = 0;
  let emptyRepoCount = 0;
  const languageSet = new Set();

  for (const repo of allRepoNodes) {
    const stars = repo.stargazerCount || 0;
    const forks = repo.forkCount || 0;
    const watchers = repo.watchers?.totalCount || 0;
    const disk = repo.diskUsage || 0;

    totalStars += stars;
    totalForks += forks;
    totalWatchers += watchers;

    // Meaningful repo = has content (disk > 0 or stars > 0 or forks > 0)
    if (disk > 0 || stars >= 1 || forks >= 1) {
      meaningfulRepoCount++;
    } else {
      emptyRepoCount++;
    }

    // Languages
    if (repo.languages?.nodes) {
      for (const lang of repo.languages.nodes) {
        if (lang.name) languageSet.add(lang.name);
      }
    }
  }

  const totalRepoCount = user.repositories.totalCount || allRepoNodes.length;

  // --- PR merge tracking with self-PR filtering ---
  let prsMergedTotal = 0;
  let selfRepoPRs = 0;

  for (const repo of allRepoNodes) {
    prsMergedTotal += repo.pullRequests?.totalCount || 0;
  }

  // Self-PR filtering from pullRequestContributionsByRepository
  const prContribs =
    cc.pullRequestContributionsByRepository || [];
  let totalPRContribs = 0;
  let selfPRContribs = 0;

  for (const entry of prContribs) {
    const count = entry.contributions?.totalCount || 0;
    const owner = entry.repository?.owner?.login || '';
    totalPRContribs += count;

    if (owner.toLowerCase() === username.toLowerCase()) {
      selfPRContribs += count;
    }
  }

  selfRepoPRs = selfPRContribs;
  const prsMergedExternal = Math.max(0, totalPRContribs - selfPRContribs);

  const selfPRPercentage =
    prsOpened > 0 ? Math.round((selfRepoPRs / prsOpened) * 100) : 0;

  // --- Contribution calendar: streak + last 30 days ---
  const calendar = cc.contributionCalendar;
  const allDays = [];

  if (calendar?.weeks) {
    for (const week of calendar.weeks) {
      for (const day of week.contributionDays) {
        allDays.push({
          date: day.date,
          count: day.contributionCount,
        });
      }
    }
  }

  // Sort descending by date
  allDays.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Contributions last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const contributionsLast30Days = allDays
    .filter((d) => new Date(d.date) >= thirtyDaysAgo)
    .reduce((sum, d) => sum + d.count, 0);

  // Streak: consecutive non-zero days from today backwards
  let streakDays = 0;
  for (const day of allDays) {
    if (day.count > 0) {
      streakDays++;
    } else {
      break;
    }
  }

  return {
    commits,
    contributionsLast30Days,
    streakDays,
    prsOpened,
    prsMergedExternal,
    prsMergedTotal: totalPRContribs,
    issues,
    codeReviews,
    meaningfulRepoCount,
    totalRepoCount,
    emptyRepoCount,
    stars: totalStars,
    forks: totalForks,
    watchers: totalWatchers,
    followers,
    languageCount: languageSet.size,
    languageList: Array.from(languageSet),
    selfPRPercentage,
    selfRepoPRs,
    avatar: user.avatarUrl || '',
    bio: user.bio || '',
    name: user.name || '',
    contributionCalendar: allDays,
  };
}

// -------------------------------------------------------------------
// Public API — fetch stats with Redis caching.
// -------------------------------------------------------------------
async function fetchGithubStats(username, userAccessToken = null) {
  const cacheKey = `github:stats:${username}`;

  // Check Redis cache first (RULE 7: never skip cache check)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${username}`);
      return { ...JSON.parse(cached), fromCache: true };
    }
  } catch (err) {
    console.error(`Redis cache read error for ${username}:`, err.message);
    // Continue to live fetch if cache fails
  }

  console.log(`Cache MISS for ${username} — calling GitHub GraphQL`);

  const { user, allRepoNodes } = await fetchGithubGraphQL(username, userAccessToken);
  const stats = extractStats(user, allRepoNodes, username);

  // Store in Redis with TTL
  try {
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(stats));
  } catch (err) {
    console.error(`Redis cache write error for ${username}:`, err.message);
  }

  return { ...stats, fromCache: false };
}

/**
 * Invalidate cache for a specific user (called before manual sync).
 */
async function invalidateCache(username) {
  try {
    await redis.del(`github:stats:${username}`);
  } catch (err) {
    console.error(`Redis cache invalidation error for ${username}:`, err.message);
  }
}

export { fetchGithubStats, invalidateCache };
