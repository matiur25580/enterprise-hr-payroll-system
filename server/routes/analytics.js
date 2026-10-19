const express = require('express');
const AuditEvent = require('../models/AuditEvent');
const Employee = require('../models/Employee');
const { verifyToken, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/workforce', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const [headcount, payroll, departments, recordedExits] = await Promise.all([
      Employee.countDocuments(),
      Employee.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]),
      Employee.aggregate([
        {
          $group: {
            _id: '$department',
            headcount: { $sum: 1 },
            monthlyPayrollCost: { $sum: '$salary' },
          },
        },
        { $sort: { headcount: -1, _id: 1 } },
      ]),
      AuditEvent.aggregate([
        {
          $match: {
            resource: 'employee',
            action: 'deleted',
            createdAt: { $gte: firstMonth },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const exitsByMonth = new Map(recordedExits.map((item) => [item._id, item.count]));
    const monthlyExits = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
      const month = date.toISOString().slice(0, 7);
      return { month, count: exitsByMonth.get(month) ?? 0 };
    });

    res.json({
      headcount,
      monthlyPayrollCost: payroll[0]?.total ?? 0,
      departments: departments.map((item) => ({
        name: item._id || 'Unassigned',
        headcount: item.headcount,
        monthlyPayrollCost: item.monthlyPayrollCost,
      })),
      monthlyExits,
    });
  } catch (error) {
    console.error('Could not load workforce analytics:', error);
    res.status(500).json({ message: 'Could not load workforce analytics.' });
  }
});

module.exports = router;
