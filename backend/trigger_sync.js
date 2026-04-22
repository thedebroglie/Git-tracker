import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import Student from './models/Student.js';
import { syncStudent } from './services/syncService.js';

async function triggerSync() {
  await connectDB();
  const student = await Student.findOne({ githubUsername: 'parthpanchal-7' }).select('+githubAccessToken');
  if (!student) {
    console.log('No student found');
    process.exit(0);
  }
  
  try {
    const res = await syncStudent(student._id, { skipCooldown: true });
    console.log('Success:', res);
  } catch (err) {
    console.error('Error syncing:', err);
  }
  process.exit(0);
}
triggerSync();
