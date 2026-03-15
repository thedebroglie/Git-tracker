import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import students from './students.js';
import Student from '../models/Student.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gitrank-v2';

const runSeed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    let created = 0;
    let skipped = 0;

    for (const student of students) {
      const exists = await Student.findOne({ email: student.email });
      if (exists) {
        skipped++;
        continue;
      }

      await Student.create({
        enrollmentId: student.enrollmentId,
        email: student.email,
        name: student.name,
        branch: student.branch,
        year: student.year,
      });
      created++;
    }

    console.log(`Seed complete: ${created} created, ${skipped} already existed`);
    console.log(`Total students in DB: ${await Student.countDocuments()}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

runSeed();
