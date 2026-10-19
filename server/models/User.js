const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  userId: { type: String, unique: true, sparse: true, immutable: true, uppercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  dateOfBirth: { type: Date },
  password: { type: String, required: true },
<<<<<<< HEAD
  tokenVersion: { type: Number, default: 0 },
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
  role: { type: String, enum: ['admin','hr','employee'], default: 'employee', lowercase: true, trim: true }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
