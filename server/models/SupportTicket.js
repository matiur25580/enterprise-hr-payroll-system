const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true, trim: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  category: { type: String, enum: ['Payroll', 'Benefits', 'Access', 'Workplace', 'Other'], required: true },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  resolution: { type: String, trim: true, maxlength: 2000 },
  resolvedByEmail: { type: String, lowercase: true, trim: true },
}, { timestamps: true });

supportTicketSchema.index({ employeeEmail: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
