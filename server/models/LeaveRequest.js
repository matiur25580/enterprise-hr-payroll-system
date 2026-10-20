const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  employeeName: { type: String, required: true, trim: true },
  type: { type: String, enum: ['sick', 'casual', 'annual'], required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  reason: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedByEmail: { type: String, lowercase: true, trim: true },
  reviewedByRole: { type: String, enum: ['admin', 'hr'] },
}, { timestamps: true });

leaveRequestSchema.index({ employeeEmail:  1, from: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
