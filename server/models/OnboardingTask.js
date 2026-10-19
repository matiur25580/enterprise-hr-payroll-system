const mongoose = require('mongoose');

const onboardingTaskSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true, trim: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  dueDate: { type: Date },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  completedAt: { type: Date },
  createdByEmail: { type: String, required: true, lowercase: true, trim: true },
}, { timestamps: true });

onboardingTaskSchema.index({ employee: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('OnboardingTask', onboardingTaskSchema);
