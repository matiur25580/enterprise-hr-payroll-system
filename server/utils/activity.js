const Activity = require('../models/Activity');

async function recordWorkplaceActivity(req, employeeEmail, category, message) {
  try {
    await Activity.create({
      actorEmail: String(req.user.email).toLowerCase(),
      actorRole: req.user.role,
      employeeEmail: String(employeeEmail).toLowerCase(),
      category,
      message
    });
  } catch (error) {
    console.error(`Could not record ${category} activity:`, error);
  }
}

module.exports = recordWorkplaceActivity;
