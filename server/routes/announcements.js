const express = require('express');
const Announcement = require('../models/Announcement');
const { verifyToken, authorize } = require('../middleware/auth');
const recordAudit = require('../utils/audit');

const router = express.Router();

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const now = new Date();
    const query = {
      $and: [
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
        req.user.role === 'admin' ? {} : { audience: { $in: ['all', req.user.role] } },
      ],
    };
    const announcements = await Announcement.find(query).sort({ createdAt: -1 }).limit(100).lean();
    res.json(announcements);
  } catch (error) {
    console.error('Could not load announcements:', error);
    res.status(500).json({ message: 'Could not load announcements' });
  }
});

router.post('/', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const { title, body, audience, expiresAt } = req.body;
    if (
      typeof title !== 'string' || title.trim().length < 4 || title.trim().length > 120
      || typeof body !== 'string' || body.trim().length < 10 || body.trim().length > 2000
      || !['all', 'hr', 'employee'].includes(audience)
    ) {
      return res.status(400).json({ message: 'Enter a title, message, and valid audience.' });
    }

    let expiry;
    if (expiresAt !== undefined && expiresAt !== '') {
      expiry = typeof expiresAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiresAt)
        ? new Date(`${expiresAt}T23:59:59.999Z`)
        : new Date(expiresAt);
      if (!Number.isFinite(expiry.getTime()) || expiry <= new Date()) {
        return res.status(400).json({ message: 'Announcement expiry must be a valid future date.' });
      }
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      body: body.trim(),
      audience,
      authorEmail: req.user.email,
      ...(expiry ? { expiresAt: expiry } : {}),
    });
    await recordAudit(req, 'published', 'announcement', announcement._id, `Published an announcement for ${audience}.`);
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Could not publish announcement:', error);
    res.status(500).json({ message: 'Could not publish announcement' });
  }
});

router.delete('/:id', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    await recordAudit(req, 'deleted', 'announcement', announcement._id, `Removed announcement "${announcement.title}".`);
    res.json({ message: 'Announcement removed' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid announcement ID' });
    console.error('Could not remove announcement:', error);
    res.status(500).json({ message: 'Could not remove announcement' });
  }
});

module.exports = router;
