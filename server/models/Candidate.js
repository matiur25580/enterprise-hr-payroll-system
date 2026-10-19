const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  position: { type: String, required: true, trim: true, maxlength: 120 },
  source: { type: String, trim: true, maxlength: 120, default: '' },
  stage: {
    type: String,
    enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'],
    default: 'Applied',
  },
  createdByEmail: { type: String, required: true, lowercase: true, trim: true },
}, { timestamps: true });

candidateSchema.index({ email: 1, position: 1, stage: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
