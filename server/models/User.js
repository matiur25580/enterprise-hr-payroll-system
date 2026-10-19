const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  userId: { type: String, unique: true, sparse: true, immutable: true, uppercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  dateOfBirth: { type: Date },
  password: { type: String, required: true },
  department: { type: String, trim: true },
  designation: { type: String, trim: true },
  salary: { type: Number, min: 0 },
  tokenVersion: { type: Number, default: 0 },
  role: { type: String, enum: ['admin','hr','employee'], default: 'employee', lowercase: true, trim: true },
  status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'active', lowercase: true, trim: true }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
