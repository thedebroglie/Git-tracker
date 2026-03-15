// test-github.js
import dotenv from 'dotenv';
dotenv.config();
import { fetchGithubStats } from './services/githubService.js';

const username = 'thedebroglie';
const stats = await fetchGithubStats(username);
console.log(JSON.stringify(stats, null, 2));
process.exit(0);
