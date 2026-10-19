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
<<<<<<< HEAD
      'payroll-issued',
      'performance-reviewed'
    ]
  },
  message: { type: String, required: true },
  readBy: { type: [String], default: [] }
=======
      'payroll-issued'
    ]
  },
  message: { type: String, required: true }
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
