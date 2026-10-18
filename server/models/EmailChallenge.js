const mongoose = require('mongoose');

const emailChallengeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['signup', 'password-reset'], required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  resendAfter: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  pendingSignup: {
    name: String,
    phone: String,
    dateOfBirth: Date,
    role: String,
    password: String,
  },
  userId: String,
}, { timestamps: true });

emailChallengeSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailChallenge', emailChallengeSchema);
