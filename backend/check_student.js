import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import Student from './models/Student.js';

async function checkStudent() {
  await connectDB();
  const student = await Student.findOne({ githubUsername: 'parthpanchal-7' }).select('+githubAccessToken');
  if (!student) {
    console.log('No student found');
  } else {
    console.log('Student ID:', student._id);
    console.log('Github connected:', student.githubConnected);
    console.log('Has Access Token:', !!student.githubAccessToken);
    if (student.githubAccessToken) {
        console.log('Token starts with:', student.githubAccessToken.substring(0, 10) + '...');
    }
  }
  process.exit(0);
}
checkStudent();
