const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  actorId: { type: String, required: true },
  actorEmail: { type: String, required: true, lowercase: true, trim: true },
  actorRole: { type: String, enum: ['admin', 'hr', 'employee'], required: true },
  action: { type: String, required: true, trim: true, maxlength: 80 },
  resource: { type: String, required: true, trim: true, maxlength: 80 },
  resourceId: { type: String, trim: true, maxlength: 120 },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });

auditEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
