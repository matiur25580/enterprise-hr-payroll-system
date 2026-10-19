const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true, trim: true },
  employeeEmail: { type: String, required: true, lowercase: true, trim: true },
  reviewerEmail: { type: String, required: true, lowercase: true, trim: true },
  reviewerRole: { type: String, enum: ['admin', 'hr'], required: true },
  period: { type: String, required: true, match: /^\d{4}-Q[1-4]$/ },
  rating: { type: Number, required: true, min: 1, max: 5 },
  summary: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
}, { timestamps: true });

performanceReviewSchema.index({ employee: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
