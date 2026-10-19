const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  normalizedName: { type: String, required: true, lowercase: true, trim: true, unique: true },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  createdByEmail: { type: String, required: true, lowercase: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
