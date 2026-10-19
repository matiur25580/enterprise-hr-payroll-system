const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token || !process.env.JWT_SECRET) return res.status(401).json({ message: 'Invalid token' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  if (!decoded || typeof decoded !== 'object' || !mongoose.isValidObjectId(decoded.id)
    || !['admin', 'hr', 'employee'].includes(decoded.role)
    || typeof decoded.email !== 'string' || !Number.isInteger(decoded.tokenVersion)) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const user = await User.findById(decoded.id).select('name role email tokenVersion').lean();
    if (!user || decoded.role !== user.role || decoded.email !== user.email
      || decoded.tokenVersion !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }
    req.user = { id: String(user._id), name: user.name, role: user.role, email: user.email };
    return next();
  } catch (error) {
    console.error('Could not validate authenticated user:', error);
    return res.status(500).json({ message: 'Could not validate your session.' });
  }
};

const authorize = (...roles)=>{
  return (req,res,next)=>{
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    return next();
  };
};
module.exports = {verifyToken, authorize};
