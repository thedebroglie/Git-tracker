/**
 * This module MUST be the first import in server.js.
 * ES module imports are hoisted, so dotenv must be loaded via a
 * side-effect import before any other modules read process.env.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
