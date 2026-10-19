const express = require('express');
<<<<<<< HEAD
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const { verifyToken, authorize } = require('../middlewares/auth');
=======
const Activity = require('../models/Activity');
const { verifyToken, authorize } = require('../middleware/auth');
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018

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

<<<<<<< HEAD
router.patch('/:id/read', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid activity ID.' });
  }
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'employee') query.employeeEmail = String(req.user.email).toLowerCase();
    const activity = await Activity.findOneAndUpdate(
      query,
      { $addToSet: { readBy: String(req.user.email).toLowerCase() } },
      { new: true },
    ).lean();
    if (!activity) return res.status(404).json({ message: 'Activity not found.' });
    res.json(activity);
  } catch (error) {
    console.error('Could not mark workplace activity as read:', error);
    res.status(500).json({ message: 'Could not update notification status.' });
  }
});

=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
module.exports = router;
