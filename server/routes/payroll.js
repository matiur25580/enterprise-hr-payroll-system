const express = require('express');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const PDFDocument = require('pdfkit');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');

const router = express.Router();

const calculatePayroll = (salary) => {
  const basic = Math.round(salary * 0.5);
  const hra = Math.round(salary * 0.4);
  const da = salary - basic - hra;
  const pf = Math.round(basic * 0.12);
  let tax = 0;
  if (salary > 100000) tax = Math.round(salary * 0.2);
  else if (salary > 50000) tax = Math.round(salary * 0.1);
  else if (salary > 25000) tax = Math.round(salary * 0.05);
  return { basic, hra, da, pf, tax, net: salary - pf - tax };
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

router.get('/summary', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const match = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const [summary] = await Payroll.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$grossSalary' } } },
    ]);
    return res.json({ total: summary?.total ?? 0 });
  } catch (error) {
    console.error('Could not load payroll summary:', error);
    return res.status(500).json({ message: 'Could not load payroll summary.' });
  }
});

router.get('/:employeeId/payslip', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.employeeId)) {
    return res.status(400).json({ message: 'Invalid employee ID.' });
  }
  const { month } = req.query;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ message: 'Select a valid payslip month.' });
  }

  try {
    const employee = await Employee.findById(req.params.employeeId).select('email');
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    if (req.user.role === 'employee' && employee.email.toLowerCase() !== String(req.user.email).toLowerCase()) {
      return res.status(403).json({ message: 'You can only download your own payslips.' });
    }

    const record = await Payroll.findOne({ employeeId: employee._id, month }).lean();
    if (!record) return res.status(404).json({ message: `No payroll record found for ${month}.` });

    const da = Number.isFinite(record.da) ? record.da : record.grossSalary - record.basic - record.hra;
    const filename = `${month}-${record.employeeName.replace(/[^a-z0-9-]+/gi, '-')}-payslip.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const document = new PDFDocument({ size: 'A4', margin: 50 });
    document.pipe(res);
    document.fontSize(20).text('Payslip', { align: 'center' });
    document.moveDown();
    document.fontSize(11)
      .text(`Employee: ${record.employeeName}`)
      .text(`Email: ${record.employeeEmail}`)
      .text(`Department: ${record.department || '—'}`)
      .text(`Pay period: ${month}`);
    document.moveDown();
    document.fontSize(12).text('Earnings and deductions', { underline: true });
    document.moveDown(0.5);
    document.fontSize(11)
      .text(`Basic salary: INR ${record.basic.toFixed(2)}`)
      .text(`HRA: INR ${record.hra.toFixed(2)}`)
      .text(`DA: INR ${da.toFixed(2)}`)
      .text(`Gross salary: INR ${record.grossSalary.toFixed(2)}`)
      .text(`Provident fund: INR ${record.pf.toFixed(2)}`)
      .text(`Tax: INR ${record.tax.toFixed(2)}`);
    if (record.deduction) document.text(`Other deductions: INR ${record.deduction.toFixed(2)}`);
    document.moveDown();
    document.fontSize(14).text(`Net pay: INR ${record.net.toFixed(2)}`);
    document.end();
    return undefined;
  } catch (error) {
    console.error('Could not generate payslip PDF:', error);
    if (res.headersSent) return res.end();
    return res.status(500).json({ message: 'Could not generate the payslip PDF.' });
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
    const invalidSalaryEmployee = employees.find((employee) => !Number.isFinite(Number(employee.salary)) || Number(employee.salary) < 0);
    if (invalidSalaryEmployee) {
      return res.status(422).json({ message: `Invalid salary on ${invalidSalaryEmployee.name}'s employee record` });
    }

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
    await recordAudit(req, 'generated', 'payroll', undefined, `Generated ${month} payroll for ${created.length} employee(s).`);
    res.status(201).json({ message: `Payroll generated for ${created.length} employee(s)`, records: created });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Payroll for this month was generated by another request. Refresh the payroll register.' });
    }
    console.error('Could not generate payroll:', error);
    res.status(500).json({ message: 'Could not generate payroll' });
  }
});

router.patch('/:id/pay', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid payroll record ID.' });
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
    await recordAudit(req, 'paid', 'payroll', record._id, `Marked ${record.month} payroll as paid for ${record.employeeName}.`);
    res.json(record);
  } catch (error) {
    console.error('Could not update payroll status:', error);
    res.status(500).json({ message: 'Could not update payroll status' });
  }
});

module.exports = router;
