const mongoose = require('mongoose');

const trainingRecordSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true, trim: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  course: { type: String, required: true, trim: true, maxlength: 160 },
  provider: { type: String, trim: true, maxlength: 120, default: '' },
  dueDate: { type: Date },
  status: { type: String, enum: ['Assigned', 'In Progress', 'Completed'], default: 'Assigned' },
  completedAt: { type: Date },
  createdByEmail: { type: String, required: true, lowercase: true, trim: true },
}, { timestamps: true });

trainingRecordSchema.index({ employee: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('TrainingRecord', trainingRecordSchema);
