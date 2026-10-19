const express = require('express');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');

const router = express.Router();
const rolePrefixes = { admin: 'AD', hr: 'HR', employee: 'EM' };
const validRoles = new Set(Object.keys(rolePrefixes));

router.post('/create-by-admin', verifyToken, authorize('admin'), async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
  const designation = typeof req.body.designation === 'string' ? req.body.designation.trim() : '';
  const password = req.body.password;
  const role = typeof req.body.role === 'string' ? req.body.role.trim().toLowerCase() : '';
  const salary = req.body.salary === '' ? NaN : Number(req.body.salary);

  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !department || department.length > 120 || !designation || designation.length > 120
    || !Number.isFinite(salary) || salary < 0
    || typeof password !== 'string' || password.length < 6 || password.length > 128
    || !validRoles.has(role)) {
    return res.status(400).json({ message: 'Provide a valid name, email, department, designation, salary, password (at least 6 characters), and role.' });
  }

  let createdUser;
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

    await recordWorkplaceActivity(req, email, 'employee-added', `${name} was added to the employee directory.`);
    await recordAudit(req, 'created', 'employee', employee._id, `Added employee ${name} and a ${role} account.`);

    return res.status(201).json({
      ok: true,
      message: 'Employee and account created successfully.',
      employeeId: employee.employeeId,
      accountId: user.userId,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
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
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Employee or account data is invalid.' });
    }
    console.error('Could not create employee and account:', error);
    return res.status(500).json({ message: 'Could not create the employee and account.' });
  }
});

module.exports = router;
