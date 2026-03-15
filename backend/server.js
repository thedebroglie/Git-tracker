import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { redis } from './config/redis.js';
import { enqueueNightlySync } from './queues/syncQueue.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import studentRoutes from './routes/studentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Root health check ───
app.get('/', (req, res) => {
  res.json({ status: 'GitRank API running' });
});

// ─── Routes ───
app.use('/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/student', studentRoutes);

// ─── Health check ───
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── 404 handler ───
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global error handler ───
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Startup ───
const startServer = async () => {
  try {
    // Connect to MongoDB (also sets up indexes)
    await connectDB();

    // Verify Redis connectivity
    const pong = await redis.ping();
    console.log(`Redis ping: ${pong}`);

    // Register nightly BullMQ repeatable job (Gap 1 fix)
    await enqueueNightlySync();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
