// test-github-quick.js — Runs fetchGithubStats and shows key fields only
import dotenv from 'dotenv';
dotenv.config();
import { fetchGithubStats } from './services/githubService.js';

const username = 'thedebroglie';
const stats = await fetchGithubStats(username);

// Print key fields without the full calendar
const { contributionCalendar, ...keyStats } = stats;
console.log('Key stats:', JSON.stringify(keyStats, null, 2));
console.log('Calendar entries:', contributionCalendar?.length || 0);
process.exit(0);
