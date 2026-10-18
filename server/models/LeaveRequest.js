const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  employeeName: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewedByEmail: { type: String, lowercase: true, trim: true },
  reviewedByRole: { type: String, enum: ['admin', 'hr'] }
}, { timestamps: true });

leaveRequestSchema.index({ employeeEmail: 1, date: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
