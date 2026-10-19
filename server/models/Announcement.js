const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 4, maxlength: 120 },
  body: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  audience: { type: String, enum: ['all', 'hr', 'employee'], default: 'all' },
  authorEmail: { type: String, required: true, lowercase: true, trim: true },
  expiresAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
