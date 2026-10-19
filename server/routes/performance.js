const express = require('express');
const Employee = require('../models/Employee');
const PerformanceReview = require('../models/PerformanceReview');
const { verifyToken, authorize } = require('../middleware/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');

const router = express.Router();

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee' ? { employeeEmail: req.user.email } : {};
    const reviews = await PerformanceReview.find(query).sort({ period: -1, createdAt: -1 }).limit(500).lean();
    res.json(reviews);
  } catch (error) {
    console.error('Could not load performance reviews:', error);
    res.status(500).json({ message: 'Could not load performance reviews' });
  }
});

router.post('/', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { employeeId, period, rating, summary } = req.body;
    if (
      typeof employeeId !== 'string'
      || !/^\d{4}-Q[1-4]$/.test(period)
      || !Number.isInteger(rating) || rating < 1 || rating > 5
      || typeof summary !== 'string' || summary.trim().length < 10 || summary.trim().length > 2000
    ) {
      return res.status(400).json({ message: 'Provide an employee, quarter, 1–5 rating, and review summary.' });
    }

    const employee = await Employee.findById(employeeId).select('_id name email');
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    const review = await PerformanceReview.create({
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      reviewerEmail: req.user.email,
      reviewerRole: req.user.role,
      period,
      rating,
      summary: summary.trim(),
    });
    await recordWorkplaceActivity(
      req,
      employee.email,
      'performance-reviewed',
      `${employee.name} received a performance review for ${period}.`,
    );
    await recordAudit(req, 'created', 'performance-review', review._id, `Saved a performance review for ${employee.name} (${period}).`);
    res.status(201).json(review);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid employee ID.' });
    if (error.code === 11000) return res.status(409).json({ message: 'A review already exists for this employee and quarter.' });
    console.error('Could not save performance review:', error);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({ message: 'Could not save performance review' });
  }
});

module.exports = router;
