// test-score.js
import { calculateScore } from './services/scoreEngine.js';

// Test 1: Extreme values — caps must kick in
const extremeStats = {
  commits: 50000,              // cap at 5000
  contributionsLast30Days: 900,// cap at 300
  streakDays: 700,             // cap at 365
  prsOpened: 500,              // cap at 200
  prsMergedExternal: 400,      // cap at 150
  issues: 800,                 // cap at 300
  codeReviews: 600,            // cap at 200
  meaningfulRepoCount: 200,    // cap at 50
  stars: 10000,                // log scaled
  forks: 5000,                 // log scaled
  watchers: 2000,              // cap at 500
  followers: 10000,            // cap at 2000
  languageCount: 50,           // cap at 20
};

const result1 = calculateScore(extremeStats);
console.log('EXTREME INPUT TEST:');
console.log('Total score:', result1.total);
console.log('Breakdown:', result1.breakdown);
console.log('Is score below 15000?', result1.total < 15000 ? 'PASS' : 'FAIL — caps not working');

// Test 2: Realistic student values
const realisticStats = {
  commits: 450, contributionsLast30Days: 28, streakDays: 5,
  prsOpened: 12, prsMergedExternal: 8, issues: 15, codeReviews: 3,
  meaningfulRepoCount: 18, stars: 67, forks: 12, watchers: 45,
  followers: 80, languageCount: 6,
};

const result2 = calculateScore(realisticStats);
console.log('\nREALISTIC STUDENT TEST:');
console.log('Total score:', result2.total);
console.log('Expected range: 1000 - 3000');
console.log('In Silver/Gold range?', result2.total > 500 && result2.total < 5000 ? 'PASS' : 'CHECK');
