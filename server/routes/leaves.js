const express = require('express');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');
const buildPendingLeaveReviewFilter = require('../utils/leave-review');

const router = express.Router();
const leaveTypes = ['sick', 'casual', 'annual'];

const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
};

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const requests = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
    return res.json(requests);
  } catch (error) {
    console.error('Could not load leave requests:', error);
    return res.status(500).json({ message: 'Could not load leave requests' });
  }
});

router.post('/', verifyToken, authorize('employee'), async (req, res) => {
  const from = parseDate(req.body.from);
  const to = parseDate(req.body.to);
  const type = typeof req.body.type === 'string' ? req.body.type.toLowerCase() : '';
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  const today = new Date().toISOString().slice(0, 10);
  if (!leaveTypes.includes(type) || !from || !to || req.body.from < today
    || from > to || reason.length < 10 || reason.length > 500) {
    return res.status(400).json({ message: 'Provide a valid leave type, future date range, and reason (10-500 characters).' });
  }

  try {
    const employee = await Employee.findOne({ email: String(req.user.email).toLowerCase() });
    if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account' });
    const request = await LeaveRequest.create({
      employeeId: employee._id,
      employeeEmail: employee.email,
      employeeName: employee.name,
      type,
      from,
      to,
      reason,
    });
    await recordWorkplaceActivity(
      req,
      employee.email,
      'leave-requested',
      `${employee.name} submitted a ${type} leave request from ${req.body.from} to ${req.body.to}.`,
    );
    await recordAudit(req, 'created', 'leave-request', request._id, `Submitted a leave request for ${request.employeeName}.`);
    return res.status(201).json(request);
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Leave request data is invalid.' });
    }
    console.error('Could not submit leave request:', error);
    return res.status(500).json({ message: 'Could not submit leave request' });
  }
});

const reviewRequest = (status) => async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid leave request ID.' });
  }
  try {
    const request = await LeaveRequest.findOneAndUpdate(
      buildPendingLeaveReviewFilter(req.params.id),
      {
        $set: {
          status,
          reviewedByEmail: String(req.user.email).toLowerCase(),
          reviewedByRole: req.user.role,
        },
      },
      { new: true, runValidators: true },
    );
    if (!request) {
      const exists = await LeaveRequest.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        message: exists ? 'This leave request has already been reviewed' : 'Leave request not found',
      });
    }
    await recordWorkplaceActivity(
      req,
      request.employeeEmail,
      'leave-reviewed',
      `${request.employeeName}'s leave request from ${request.from.toISOString().slice(0, 10)} to ${request.to.toISOString().slice(0, 10)} was ${status}.`,
    );
    await recordAudit(req, 'reviewed', 'leave-request', request._id, `Marked ${request.employeeName}'s leave request ${status}.`);
    return res.json(request);
  } catch (error) {
    console.error('Could not review leave request:', error);
    return res.status(500).json({ message: 'Could not review leave request' });
  }
};

router.put('/:id/approve', verifyToken, authorize('admin', 'hr'), reviewRequest('approved'));
router.put('/:id/reject', verifyToken, authorize('admin', 'hr'), reviewRequest('rejected'));

module.exports = router;
