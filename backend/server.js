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
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
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
app.use('/api/webhooks', webhookRoutes);

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

    // Verify Redis connectivity; continue in degraded local mode if unavailable.
    let redisReady = false;
    try {
      const pong = await redis.ping();
      redisReady = pong === 'PONG';
      console.log(`Redis ping: ${pong}`);
    } catch (redisError) {
      console.warn(`Redis unavailable, continuing in degraded mode: ${redisError.message}`);
    }

    // Register nightly BullMQ repeatable job only when Redis is available.
    if (redisReady) {
      await enqueueNightlySync();
    } else {
      console.warn('Nightly sync scheduler skipped because Redis is unavailable.');
    }

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
