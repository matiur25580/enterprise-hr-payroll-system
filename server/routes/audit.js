const express = require('express');
const AuditEvent = require('../models/AuditEvent');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit ?? 100);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 200) {
      return res.status(400).json({ message: 'Audit log limit must be between 1 and 200.' });
    }
    const events = await AuditEvent.find({})
      .sort({ createdAt: -1 })
      .limit(requestedLimit)
      .lean();
    res.json(events);
  } catch (error) {
    console.error('Could not load audit events:', error);
    res.status(500).json({ message: 'Could not load audit events' });
  }
});

module.exports = router;
