const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  actorEmail: { type: String, required: true, lowercase: true, trim: true },
  actorRole: { type: String, required: true, enum: ['admin', 'hr', 'employee'] },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: [
      'employee-added',
      'employee-updated',
      'employee-removed',
      'leave-requested',
      'leave-reviewed',
      'attendance-recorded',
      'payroll-issued'
    ]
  },
  message: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
