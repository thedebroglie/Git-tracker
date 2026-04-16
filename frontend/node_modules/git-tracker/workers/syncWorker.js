/**
 * BullMQ Sync Worker — runs as a SEPARATE PROCESS.
 *
 * Start with:  node workers/syncWorker.js
 *
 * This process handles all GitHub sync jobs. The API server (server.js)
 * never imports this file — they communicate only through Redis/BullMQ.
 */

import dotenv from 'dotenv';
dotenv.config();

import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { connectDB } from '../config/db.js';
import { syncStudent } from '../services/syncService.js';
import { syncQueue } from '../queues/syncQueue.js';
import Student from '../models/Student.js';

// Connect to MongoDB (worker has its own connection)
await connectDB();

console.log('Sync worker starting...');

const worker = new Worker(
  'github-sync',
  async (job) => {
    console.log(`[Worker] Processing job ${job.id} (${job.name})`);

    if (job.name === 'sync-student') {
      // ─── Single student manual sync ───
      const { studentId } = job.data;
      const result = await syncStudent(studentId, { skipCooldown: true });
      return result;
    }

    if (job.name === 'sync-all-students') {
      // ─── Nightly batch: enqueue each connected student ───
      const students = await Student.find(
        { githubConnected: true },
        '_id githubUsername'
      );

      console.log(`[Worker] Nightly sync: queuing ${students.length} students`);

      for (let i = 0; i < students.length; i++) {
        await syncQueue.add(
          'sync-student',
          { studentId: students[i]._id.toString() },
          {
            delay: i * 500, // stagger 500ms apart
            jobId: `nightly:${students[i]._id}:${Date.now()}`,
          }
        );
      }

      return { queued: students.length };
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // process up to 3 students simultaneously
  }
);

worker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[Worker] Error:', err.message);
});

console.log('Sync worker running — waiting for jobs...');
