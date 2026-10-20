const mongoose = require('mongoose');
const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { type: String, enum: ['present','absent','late'], default: 'present' }
}, { timestamps: true });
attendanceSchema.pre('validate', function () {
  if (!this.employeeId) this.employeeId = this.employee;
});
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', attendanceSchema);
