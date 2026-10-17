const mongoose = require('mongoose');
module.exports = mongoose.model('Payroll', new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  month: String,
  basic: Number,
  bonus: { type: Number, default: 0 },
  deduction: { type: Number, default: 0 },
  net: Number
},{timestamps:true}));
