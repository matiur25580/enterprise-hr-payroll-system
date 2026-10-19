const express = require('express');
<<<<<<< HEAD
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');
=======
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { verifyToken, authorize } = require('../middleware/auth');
const recordWorkplaceActivity = require('../utils/activity');
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018

const router = express.Router();

const todayKey = () => new Date().toISOString().slice(0, 10);
<<<<<<< HEAD
const parseDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
};
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findSignedInEmployee = (email) => Employee.findOne({
  email: { $regex: `^${escapeRegExp(String(email).toLowerCase())}$`, $options: 'i' }
});

<<<<<<< HEAD
router.get('/calendar', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  const fromDate = parseDateKey(req.query.from);
  const toDate = parseDateKey(req.query.to);
  if (!fromDate || !toDate || fromDate > toDate || toDate - fromDate > 92 * 24 * 60 * 60 * 1000) {
    return res.status(400).json({ message: 'Provide a valid attendance range of at most 93 days.' });
  }
  try {
    const query = { date: { $gte: req.query.from, $lte: req.query.to } };
    if (req.user.role === 'employee') {
      const employee = await findSignedInEmployee(req.user.email);
      if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
      query.employee = employee._id;
    }
    const records = await Attendance.find(query).populate('employee', 'name email department').sort({ date: 1 }).lean();
    res.json(records);
  } catch (error) {
    console.error('Could not load attendance calendar:', error);
    res.status(500).json({ message: 'Could not load attendance calendar' });
  }
});

=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = { date: todayKey() };
    if (req.user.role === 'employee') {
      const employee = await findSignedInEmployee(req.user.email);
      if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
      query.employee = employee._id;
    }
    const records = await Attendance.find(query)
      .populate('employee', 'name email department designation')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(records);
  } catch (error) {
    console.error('Could not load attendance:', error);
    res.status(500).json({ message: 'Could not load attendance' });
  }
});

router.post('/checkin', verifyToken, authorize('employee'), async (req, res) => {
  try {
    const employee = await findSignedInEmployee(req.user.email);
    if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
    const date = todayKey();
    const existing = await Attendance.findOne({ employee: employee._id, date });
    if (existing?.checkIn) return res.status(409).json({ message: 'You have already checked in today' });
    const record = existing || new Attendance({ employee: employee._id, date });
    record.checkIn = new Date();
    record.status = 'present';
    await record.save();
    await recordWorkplaceActivity(
      req,
      employee.email,
      'attendance-recorded',
      `${employee.name} checked in for work.`
    );
<<<<<<< HEAD
    await recordAudit(req, 'checked-in', 'attendance', record._id, `Recorded a check-in for ${employee.name}.`);
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
    res.status(201).json(record);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already checked in today' });
    }
    console.error('Could not check in:', error);
    res.status(500).json({ message: 'Could not check in' });
  }
});

router.post('/checkout', verifyToken, authorize('employee'), async (req, res) => {
  try {
    const employee = await findSignedInEmployee(req.user.email);
    if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
    const record = await Attendance.findOne({ employee: employee._id, date: todayKey() });
    if (!record) return res.status(404).json({ message: 'No check-in found for today' });
    if (record.checkOut) return res.status(409).json({ message: 'You have already checked out today' });

    record.checkOut = new Date();
    await record.save();
    await recordWorkplaceActivity(
      req,
      employee.email,
      'attendance-recorded',
      `${employee.name} checked out for the day.`
    );
<<<<<<< HEAD
    await recordAudit(req, 'checked-out', 'attendance', record._id, `Recorded a check-out for ${employee.name}.`);
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
    res.json(record);
  } catch (error) {
    console.error('Could not check out:', error);
    res.status(500).json({ message: 'Could not check out' });
  }
});

router.put('/:employeeId', verifyToken, authorize('admin', 'hr'), async (req, res) => {
<<<<<<< HEAD
  if (!mongoose.isValidObjectId(req.params.employeeId)) return res.status(400).json({ message: 'Invalid employee ID.' });
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
  try {
    const { status } = req.body;
    if (status !== 'present' && status !== 'absent') {
      return res.status(400).json({ message: 'Attendance status must be present or absent' });
    }
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const record = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: todayKey() },
      {
        $set: { status },
        $setOnInsert: { employee: employee._id, date: todayKey() }
      },
      { new: true, upsert: true, runValidators: true }
    );
    await recordWorkplaceActivity(
      req,
      employee.email,
      'attendance-recorded',
      `${employee.name}'s attendance was marked ${status}.`
    );
<<<<<<< HEAD
    await recordAudit(req, 'updated', 'attendance', record._id, `Marked ${employee.name} ${status}.`);
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
    res.json(record);
  } catch (error) {
    console.error('Could not update attendance:', error);
    res.status(500).json({ message: 'Could not update attendance' });
  }
});

module.exports = router;
