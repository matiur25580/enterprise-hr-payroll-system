const express = require('express');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { verifyToken, authorize } = require('../middleware/auth');
const recordWorkplaceActivity = require('../utils/activity');

const router = express.Router();

const todayKey = () => new Date().toISOString().slice(0, 10);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findSignedInEmployee = (email) => Employee.findOne({
  email: { $regex: `^${escapeRegExp(String(email).toLowerCase())}$`, $options: 'i' }
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
    res.json(record);
  } catch (error) {
    console.error('Could not check out:', error);
    res.status(500).json({ message: 'Could not check out' });
  }
});

router.put('/:employeeId', verifyToken, authorize('admin', 'hr'), async (req, res) => {
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
    res.json(record);
  } catch (error) {
    console.error('Could not update attendance:', error);
    res.status(500).json({ message: 'Could not update attendance' });
  }
});

module.exports = router;
