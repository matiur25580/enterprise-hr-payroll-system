const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');
const sendWelcomeEmail = require('../utils/email').sendWelcomeEmail;

const router = express.Router();
const rolePrefixes = { admin: 'AD', hr: 'HR', employee: 'EM' };
const validRoles = new Set(Object.keys(rolePrefixes));

router.get('/pending-approvals', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' })
      .select('name email createdAt')
      .sort({ createdAt: 1 })
      .lean();
    return res.json(users);
  } catch (error) {
    console.error('Could not load pending account approvals:', error);
    return res.status(500).json({ message: 'Could not load pending account approvals.' });
  }
});

router.patch('/pending-approvals/:id', verifyToken, authorize('admin'), async (req, res) => {
  const { status, role } = req.body;
  if (!mongoose.isValidObjectId(req.params.id)
    || !['active', 'rejected'].includes(status)
    || !['hr', 'employee'].includes(role)) {
    return res.status(400).json({ message: 'Choose a valid approval decision and role.' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status, role } },
      { new: true, runValidators: true },
    ).select('name email role status');
    if (!user) return res.status(404).json({ message: 'This account is no longer pending approval.' });
    return res.json({
      message: status === 'active' ? 'Account approved successfully.' : 'Account rejected.',
      user,
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Approval data is invalid.' });
    }
    console.error('Could not update pending account approval:', error);
    return res.status(500).json({ message: 'Could not update the account approval.' });
  }
});

router.post('/', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
  const designation = typeof req.body.designation === 'string' ? req.body.designation.trim() : '';
  const password = req.body.password;
  const role = typeof req.body.role === 'string' ? req.body.role.trim().toLowerCase() : '';
  const salary = req.body.salary === '' ? NaN : Number(req.body.salary);

  const allowedRoles = req.user.role === 'admin' ? ['admin', 'hr', 'employee'] : ['employee'];
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !department || department.length > 120 || !designation || designation.length > 120
    || !Number.isFinite(salary) || salary < 0
    || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72
    || !validRoles.has(role) || !allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Provide valid employee details, a password with at least 8 characters, and a role you are permitted to create.' });
  }

  let createdUser;
  let createdEmployee;
  try {
    const [existingUser, existingEmployee] = await Promise.all([
      User.exists({ email }),
      Employee.exists({ email }),
    ]);
    if (existingUser || existingEmployee) {
      return res.status(409).json({ message: 'An account or employee record with this email already exists.' });
    }

    const user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      status: 'active',
      department,
      designation,
      salary,
    });
    user.userId = `${rolePrefixes[role]}${user._id.toString().toUpperCase()}`;
    await user.save();
    createdUser = user;

    const employee = new Employee({ name, email, department, designation, salary });
    employee.employeeId = `EMP-${employee._id.toString().toUpperCase()}`;
    await employee.save();
    createdEmployee = employee;

    await sendWelcomeEmail(email, name);

    await recordWorkplaceActivity(req, email, 'employee-added', `${name} was added to the employee directory.`);
    await recordAudit(req, 'created', 'employee', employee._id, `Added employee ${name} and a ${role} account.`);

    return res.status(201).json({
      ok: true,
      employeeId: employee.employeeId,
      accountId: user.userId,
      email: user.email,
      role: user.role,
      message: 'Employee account created and welcome email sent.',
    });
  } catch (error) {
    if (createdEmployee) {
      try {
        await Employee.deleteOne({ _id: createdEmployee._id });
      } catch (cleanupError) {
        console.error('Could not roll back employee after account creation failed:', cleanupError);
      }
    }
    if (createdUser) {
      try {
        await User.deleteOne({ _id: createdUser._id });
      } catch (cleanupError) {
        console.error('Could not roll back account after employee creation failed:', cleanupError);
      }
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account or employee record with this email already exists.' });
    }
    if (error.status === 503) {
      return res.status(503).json({ message: 'Email delivery is unavailable. The employee account was not created.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Employee or account data is invalid.' });
    }
    console.error('Could not create employee and account:', error);
    return res.status(500).json({ message: 'Could not create the employee and account.' });
  }
});

module.exports = router;
