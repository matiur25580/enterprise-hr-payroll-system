const express = require('express');
<<<<<<< HEAD
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');
=======
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const { verifyToken, authorize } = require('../middleware/auth');
const recordWorkplaceActivity = require('../utils/activity');
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018

const router = express.Router();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const requests = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (error) {
    console.error('Could not load leave requests:', error);
    res.status(500).json({ message: 'Could not load leave requests' });
  }
});

router.post('/', verifyToken, authorize('employee'), async (req, res) => {
  try {
    const { date, reason } = req.body;
<<<<<<< HEAD
    const parsedDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00.000Z`)
      : new Date(NaN);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date
      || parsedDate < new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
      || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
=======
    const parsedDate = new Date(date);
    if (!date || !Number.isFinite(parsedDate.getTime()) || typeof reason !== 'string' || !reason.trim()) {
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
      return res.status(400).json({ message: 'Provide a valid leave date and reason' });
    }

    const employee = await Employee.findOne({
      email: { $regex: `^${escapeRegExp(String(req.user.email).toLowerCase())}$`, $options: 'i' }
    });
    if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });

    const request = await LeaveRequest.create({
      employee: employee._id,
      employeeEmail: employee.email,
      employeeName: employee.name,
      date: parsedDate,
      reason: reason.trim()
    });
    await recordWorkplaceActivity(
      req,
      employee.email,
      'leave-requested',
      `${employee.name} submitted a leave request for ${parsedDate.toLocaleDateString()}.`
    );
<<<<<<< HEAD
    await recordAudit(req, 'created', 'leave-request', request._id, `Submitted a leave request for ${request.employeeName}.`);
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
    res.status(201).json(request);
  } catch (error) {
    console.error('Could not submit leave request:', error);
    res.status(500).json({ message: 'Could not submit leave request' });
  }
});

router.patch('/:id', verifyToken, authorize('admin', 'hr'), async (req, res) => {
<<<<<<< HEAD
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid leave request ID.' });
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
  try {
    const { status } = req.body;
    if (status !== 'Approved' && status !== 'Rejected') {
      return res.status(400).json({ message: 'Leave status must be Approved or Rejected' });
    }
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Leave request not found' });
    if (request.status !== 'Pending') {
      return res.status(409).json({ message: 'This leave request has already been reviewed' });
    }

    request.status = status;
    request.reviewedByEmail = String(req.user.email).toLowerCase();
    request.reviewedByRole = req.user.role;
    await request.save();
    await recordWorkplaceActivity(
      req,
      request.employeeEmail,
      'leave-reviewed',
      `${request.employeeName}'s leave request for ${request.date.toLocaleDateString()} was ${status.toLowerCase()}.`
    );
<<<<<<< HEAD
    await recordAudit(req, 'reviewed', 'leave-request', request._id, `Marked ${request.employeeName}'s leave request ${status.toLowerCase()}.`);
=======
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
    res.json(request);
  } catch (error) {
    console.error('Could not review leave request:', error);
    res.status(500).json({ message: 'Could not review leave request' });
  }
});

module.exports = router;
