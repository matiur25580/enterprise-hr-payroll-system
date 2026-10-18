const express = require('express');
const Activity = require('../models/Activity');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(activities);
  } catch (error) {
    console.error('Could not load workplace activity:', error);
    res.status(500).json({ message: 'Could not load workplace activity' });
  }
});

module.exports = router;
