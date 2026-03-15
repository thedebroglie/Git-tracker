import jsonwebtoken from 'jsonwebtoken';
import Student from '../models/Student.js';

const { verify } = jsonwebtoken;

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token, process.env.JWT_SECRET);

    const student = await Student.findById(decoded.id);
    if (!student) {
      return res.status(401).json({ error: 'Invalid token. Student not found.' });
    }

    req.user = student;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

export default authMiddleware;
