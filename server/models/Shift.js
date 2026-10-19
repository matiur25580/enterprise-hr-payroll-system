const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true, trim: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  createdByEmail: { type: String, required: true, lowercase: true, trim: true },
}, { timestamps: true });

shiftSchema.index({ employee: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('Shift', shiftSchema);
