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

router.post('/', verifyToken, authorize('employee'), async (req, res) => {
  const { date, checkIn, checkOut } = req.body;
  const hasCheckIn = checkIn !== undefined && checkIn !== null;
  const hasCheckOut = checkOut !== undefined && checkOut !== null;
  const requestedDate = parseDateKey(date);
  if (!requestedDate || date !== todayKey() || !hasCheckIn) {
    return res.status(400).json({ message: 'Provide today’s date and check-in time.' });
  }
  const requestedCheckIn = new Date(checkIn);
  const requestedCheckOut = hasCheckOut ? new Date(checkOut) : null;
  if (
    typeof checkIn !== 'string'
    || !Number.isFinite(requestedCheckIn.getTime())
    || (hasCheckOut && (typeof checkOut !== 'string' || !Number.isFinite(requestedCheckOut.getTime())))
  ) {
    return res.status(400).json({ message: 'Provide valid attendance times.' });
  }

  try {
    const employee = await findSignedInEmployee(req.user.email);
    if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
    let record = await Attendance.findOne({ employee: employee._id, date });
    if (!hasCheckOut) {
      if (record?.checkIn) return res.status(409).json({ message: 'You have already checked in today' });
      record = record || new Attendance({ employee: employee._id, date });
      record.checkIn = requestedCheckIn;
      record.status = 'present';
    } else {
      if (!record?.checkIn) return res.status(404).json({ message: 'No check-in found for today' });
      if (record.checkOut) return res.status(409).json({ message: 'You have already checked out today' });
      if (requestedCheckIn.getTime() !== record.checkIn.getTime()) {
        return res.status(409).json({ message: 'The supplied check-in does not match today’s attendance record.' });
      }
      if (requestedCheckOut < record.checkIn) return res.status(400).json({ message: 'Check-out time cannot be before check-in.' });
      record.checkOut = requestedCheckOut;
    }
    await record.save();
    const action = hasCheckOut ? 'checked out' : 'checked in';
    await recordWorkplaceActivity(req, employee.email, 'attendance-recorded', `${employee.name} ${action} for work.`);
    await recordAudit(
      req,
      hasCheckOut ? 'checked-out' : 'checked-in',
      'attendance',
      record._id,
      `Recorded a ${hasCheckOut ? 'check-out' : 'check-in'} for ${employee.name}.`
    );
    res.status(hasCheckOut ? 200 : 201).json(record);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Attendance has already been recorded for today.' });
    }
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
    await recordAudit(req, 'updated', 'attendance', record._id, `Marked ${employee.name} ${status}.`);
    res.json(record);
  } catch (error) {
    console.error('Could not update attendance:', error);
    res.status(500).json({ message: 'Could not update attendance' });
  }
});

module.exports = router;
