const mongoose = require('mongoose');

const setupLockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  status: { type: String, enum: ['in-progress'], required: true },
  claimId: { type: String, required: true },
  expiresAt: { type: Date, default: null },
}, { versionKey: false });

module.exports = mongoose.model('SetupLock', setupLockSchema);
