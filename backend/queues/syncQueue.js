import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

const syncQueue = new Queue('github-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Add a single student sync job (triggered by manual refresh button).
 * jobId prevents duplicate jobs for the same student.
 */
async function enqueueSingleSync(studentId) {
  return syncQueue.add(
    'sync-student',
    { studentId: studentId.toString() },
    {
      jobId: `sync:${studentId}:${Date.now()}`,
    }
  );
}

/**
 * Register the nightly repeatable job.
 * Called once at server startup — BullMQ deduplicates by cron pattern.
 */
async function enqueueNightlySync() {
  await syncQueue.add(
    'sync-all-students',
    {},
    {
      repeat: { pattern: '0 2 * * *' }, // Every day at 02:00 AM
      jobId: 'nightly-sync',
    }
  );
  console.log('Nightly sync job registered (cron: 0 2 * * *)');
}

export { syncQueue, enqueueSingleSync, enqueueNightlySync };
