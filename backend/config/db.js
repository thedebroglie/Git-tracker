import mongoose from 'mongoose';
import Student from '../models/Student.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await setupIndexes();
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const setupIndexes = async () => {
  try {
    await Student.collection.createIndex({ score: -1 });
    await Student.collection.createIndex({ branch: 1, score: -1 });
    await Student.collection.createIndex({ year: 1, score: -1 });
    await Student.collection.createIndex({ email: 1 }, { unique: true });
    await Student.collection.createIndex({ enrollmentId: 1 }, { unique: true });
    console.log('Database indexes created');
  } catch (error) {
    // Indexes may already exist — that's fine
    if (error.code !== 85) {
      console.error('Index creation error:', error.message);
    }
  }
};

export { connectDB, setupIndexes };
