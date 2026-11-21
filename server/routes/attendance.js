const express = require('express');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');

const router = express.Router();

const todayKey = () => new Date().toISOString().slice(0, 10);
const parseDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findSignedInEmployee = (email) => Employee.findOne({
  email: { $regex: `^${escapeRegExp(String(email).toLowerCase())}$`, $options: 'i' }
});

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

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    let dateFilter = { $eq: todayKey() };
    if (req.query.month !== undefined) {
      if (typeof req.query.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month)) {
        return res.status(400).json({ message: 'Select a valid attendance month.' });
      }
      const [year, month] = req.query.month.split('-').map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      dateFilter = { $gte: `${req.query.month}-01`, $lte: `${req.query.month}-${String(lastDay).padStart(2, '0')}` };
    }
    const query = { date: dateFilter };
    if (req.user.role === 'employee') {
      const employee = await findSignedInEmployee(req.user.email);
      if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
      query.employee = employee._id;
    }
    const records = await Attendance.find(query)
      .populate('employee', 'name email department designation')
      .sort({ date: -1, updatedAt: -1 })
      .lean();
    res.json(records);
  } catch (error) {
    console.error('Could not load attendance:', error);
    res.status(500).json({ message: 'Could not load attendance' });
  }
});

router.post('/', verifyToken, authorize('employee'), async (req, res) => {
  const requestedDate = parseDateKey(req.body.date);
  if (!requestedDate || req.body.date !== todayKey() || req.body.checkOut !== undefined) {
    return res.status(400).json({ message: 'Provide today’s date. Use the checkout endpoint to end your workday.' });
  }

  try {
    const employee = await findSignedInEmployee(req.user.email);
    if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
    const record = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: req.body.date, checkIn: { $exists: false } },
      { $set: { checkIn: new Date(), status: 'present' }, $setOnInsert: { employee: employee._id, date: req.body.date } },
      { new: true, upsert: true, runValidators: true }
    );
    await recordWorkplaceActivity(req, employee.email, 'attendance-recorded', `${employee.name} checked in for work.`);
    await recordAudit(req, 'checked-in', 'attendance', record._id, `Recorded a check-in for ${employee.name}.`);
    res.status(201).json(record);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already checked in today' });
    console.error('Could not record attendance:', error);
    res.status(500).json({ message: 'Could not record attendance' });
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
    await recordAudit(req, 'checked-in', 'attendance', record._id, `Recorded a check-in for ${employee.name}.`);
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
    const date = todayKey();
    const record = await Attendance.findOneAndUpdate(
      {
        employee: employee._id,
        date,
        checkIn: { $exists: true },
        $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
      },
      { $set: { checkOut: new Date() } },
      { new: true, runValidators: true }
    );
    if (!record) {
      const existing = await Attendance.exists({ employee: employee._id, date });
      return res.status(existing ? 409 : 404).json({
        message: existing ? 'You have already checked out today' : 'No check-in found for today'
      });
    }
    await recordWorkplaceActivity(
      req,
      employee.email,
      'attendance-recorded',
      `${employee.name} checked out for the day.`
    );
    await recordAudit(req, 'checked-out', 'attendance', record._id, `Recorded a check-out for ${employee.name}.`);
    res.json(record);
  } catch (error) {
    console.error('Could not check out:', error);
    res.status(500).json({ message: 'Could not check out' });
  }
});

router.put('/:employeeId', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.employeeId)) return res.status(400).json({ message: 'Invalid employee ID.' });
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
        $set: { status, employeeId: employee._id },
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
    await recordAudit(req, 'updated', 'attendance', record._id, `Marked ${employee.name} ${status}.`);
    res.json(record);
  } catch (error) {
    console.error('Could not update attendance:', error);
    res.status(500).json({ message: 'Could not update attendance' });
  }
});

module.exports = router;
