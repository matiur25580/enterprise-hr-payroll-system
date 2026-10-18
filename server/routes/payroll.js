const express = require('express');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const { verifyToken, authorize } = require('../middleware/auth');
const recordWorkplaceActivity = require('../utils/activity');

const router = express.Router();

const calculatePayroll = (salary) => {
  const basic = Math.round(salary * 0.5);
  const hra = Math.round(salary * 0.4);
  const pf = Math.round(basic * 0.12);
  let tax = 0;
  if (salary > 100000) tax = Math.round(salary * 0.2);
  else if (salary > 50000) tax = Math.round(salary * 0.1);
  else if (salary > 25000) tax = Math.round(salary * 0.05);
  return { basic, hra, pf, tax, net: salary - pf - tax };
};

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const records = await Payroll.find(query).sort({ month: -1, createdAt: -1 }).lean();
    res.json(records);
  } catch (error) {
    console.error('Could not load payroll records:', error);
    res.status(500).json({ message: 'Could not load payroll records' });
  }
});

router.post('/generate', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { month } = req.body;
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'Select a valid payroll month' });
    }

    const employees = await Employee.find().sort({ name: 1 });
    if (!employees.length) return res.status(400).json({ message: 'Add employees before generating payroll' });

    const created = [];
    for (const employee of employees) {
      const existing = await Payroll.findOne({ employeeId: employee._id, month });
      if (existing) continue;

      const grossSalary = Number(employee.salary);
      if (!Number.isFinite(grossSalary) || grossSalary < 0) {
        return res.status(422).json({ message: `Invalid salary on ${employee.name}'s employee record` });
      }
      const calculation = calculatePayroll(grossSalary);
      const record = await Payroll.create({
        employeeId: employee._id,
        employeeEmail: employee.email,
        employeeName: employee.name,
        department: employee.department,
        month,
        grossSalary,
        ...calculation
      });
      created.push(record);
    }

    if (!created.length) {
      return res.status(409).json({ message: `Payroll for ${month} has already been generated` });
    }
    res.status(201).json({ message: `Payroll generated for ${created.length} employee(s)`, records: created });
  } catch (error) {
    console.error('Could not generate payroll:', error);
    res.status(500).json({ message: 'Could not generate payroll' });
  }
});

router.patch('/:id/pay', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });
    if (record.status === 'Paid') return res.status(409).json({ message: 'This payroll has already been marked paid' });

    record.status = 'Paid';
    record.paidAt = new Date();
    record.paidByEmail = String(req.user.email).toLowerCase();
    await record.save();
    await recordWorkplaceActivity(
      req,
      record.employeeEmail,
      'payroll-issued',
      `${record.month} payroll has been marked paid for ${record.employeeName}.`
    );
    res.json(record);
  } catch (error) {
    console.error('Could not update payroll status:', error);
    res.status(500).json({ message: 'Could not update payroll status' });
  }
});

module.exports = router;
