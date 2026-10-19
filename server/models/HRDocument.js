const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  fileName: { type: String, required: true, trim: true, maxlength: 120 },
  employeeEmail: { type: String, lowercase: true, trim: true, maxlength: 254 },
  content: { type: Buffer, required: true, select: false },
  uploadedByEmail: { type: String, required: true, lowercase: true, trim: true },
}, { timestamps: true });

documentSchema.index({ employeeEmail: 1, createdAt: -1 });

module.exports = mongoose.model('HRDocument', documentSchema);
