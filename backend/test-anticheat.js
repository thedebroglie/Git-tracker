// test-anticheat.js
import { analyze } from './services/antiCheatService.js';

// Rule 1: REPO_SPAM
const r1 = analyze({ emptyRepoCount: 25, prsOpened: 10,
  prsMergedExternal: 5, stars: 10, followers: 50, selfPRPercentage: 20,
  contributionCalendar: [] }, 'testuser');
console.log('REPO_SPAM fired:', r1.flags.includes('REPO_SPAM') ? 'PASS' : 'FAIL');

// Rule 2: ACTIVITY_BURST (mock calendar with a 250-contribution day)
const r2 = analyze({ emptyRepoCount: 2, prsOpened: 10,
  prsMergedExternal: 8, stars: 20, followers: 100, selfPRPercentage: 15,
  contributionCalendar: [{ contributionCount: 250, date: '2025-01-01' }] }, 'testuser');
console.log('ACTIVITY_BURST fired:', r2.flags.includes('ACTIVITY_BURST') ? 'PASS' : 'FAIL');

// Rule 3: PR_FARM
const r3 = analyze({ emptyRepoCount: 2, prsOpened: 60,
  prsMergedExternal: 2, stars: 10, followers: 30, selfPRPercentage: 90,
  contributionCalendar: [] }, 'testuser');
console.log('PR_FARM fired:', r3.flags.includes('PR_FARM') ? 'PASS' : 'FAIL');

// Rule 4: STAR_BOT_SUSPECTED
const r4 = analyze({ emptyRepoCount: 2, prsOpened: 10,
  prsMergedExternal: 8, stars: 600, followers: 30, selfPRPercentage: 20,
  contributionCalendar: [] }, 'testuser');
console.log('STAR_BOT fired:', r4.flags.includes('STAR_BOT_SUSPECTED') ? 'PASS' : 'FAIL');

// Rule 5: SELF_PR_INFLATION
const r5_inflation = analyze({ emptyRepoCount: 2, prsOpened: 20,
  prsMergedExternal: 8, stars: 50, followers: 80, selfPRPercentage: 90,
  contributionCalendar: [] }, 'testuser');
console.log('SELF_PR_INFLATION fired:', r5_inflation.flags.includes('SELF_PR_INFLATION') ? 'PASS' : 'FAIL');

// Clean student — no flags
const r5 = analyze({ emptyRepoCount: 3, prsOpened: 12,
  prsMergedExternal: 8, stars: 50, followers: 80, selfPRPercentage: 20,
  contributionCalendar: [] }, 'testuser');
console.log('Clean student no flags:', r5.flags.length === 0 ? 'PASS' : 'FAIL');

process.exit(0);
