const AuditEvent = require('../models/AuditEvent');

async function recordAudit(req, action, resource, resourceId, summary) {
  try {
    await AuditEvent.create({
      actorId: String(req.user.id),
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : undefined,
      summary,
    });
  } catch (error) {
    console.error(`Could not record audit event (${action} ${resource}):`, error);
  }
}

module.exports = recordAudit;
