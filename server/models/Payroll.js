const mongoose = require('mongoose');
<<<<<<< HEAD
const payrollSchema = new mongoose.Schema({
=======
module.exports = mongoose.model('Payroll', new mongoose.Schema({
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  employeeName: { type: String, required: true, trim: true },
  department: { type: String, default: '' },
  month: { type: String, required: true },
  grossSalary: { type: Number, required: true, min: 0 },
  basic: { type: Number, required: true, min: 0 },
  hra: { type: Number, required: true, min: 0 },
  pf: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  bonus: { type: Number, default: 0 },
  deduction: { type: Number, default: 0 },
  net: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paidAt: { type: Date },
  paidByEmail: { type: String, lowercase: true, trim: true }
<<<<<<< HEAD
}, { timestamps: true });
payrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
=======
},{timestamps:true}));
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
