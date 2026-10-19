const express = require('express');
const Employee = require('../models/Employee');
const SupportTicket = require('../models/SupportTicket');
const { verifyToken, authorize } = require('../middleware/auth');
const recordAudit = require('../utils/audit');

const router = express.Router();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const categories = new Set(['Payroll', 'Benefits', 'Access', 'Workplace', 'Other']);
const statuses = new Set(['Open', 'In Progress', 'Resolved']);

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: req.user.email }
      : {};
    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 }).limit(500).lean();
    res.json(tickets);
  } catch (error) {
    console.error('Could not load support tickets:', error);
    res.status(500).json({ message: 'Could not load support tickets' });
  }
});

router.post('/', verifyToken, authorize('employee'), async (req, res) => {
  try {
    const { subject, description, category } = req.body;
    if (
      typeof subject !== 'string' || subject.trim().length < 5 || subject.trim().length > 120
      || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 2000
      || !categories.has(category)
    ) {
      return res.status(400).json({ message: 'Enter a valid subject, category, and description.' });
    }

    const employee = await Employee.findOne({
      email: { $regex: `^${escapeRegExp(req.user.email)}$`, $options: 'i' },
    }).select('_id name email');
    if (!employee) return res.status(404).json({ message: 'Employee profile is not linked to this account.' });

    const ticket = await SupportTicket.create({
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      subject: subject.trim(),
      description: description.trim(),
      category,
    });
    await recordAudit(req, 'created', 'support-ticket', ticket._id, `Opened a ${category} support ticket for ${employee.name}.`);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Could not create support ticket:', error);
    res.status(500).json({ message: 'Could not create support ticket' });
  }
});

router.patch('/:id', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { status, resolution } = req.body;
    if (!statuses.has(status)) return res.status(400).json({ message: 'Select a valid ticket status.' });
    if (resolution !== undefined && (typeof resolution !== 'string' || resolution.length > 2000)) {
      return res.status(400).json({ message: 'Ticket resolution must be 2000 characters or fewer.' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found.' });
    ticket.status = status;
    if (resolution !== undefined) ticket.resolution = resolution.trim();
    if (status === 'Resolved') ticket.resolvedByEmail = req.user.email;
    else ticket.resolvedByEmail = undefined;
    await ticket.save();
    await recordAudit(req, 'updated', 'support-ticket', ticket._id, `Updated support ticket status to ${status}.`);
    res.json(ticket);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid support ticket ID.' });
    console.error('Could not update support ticket:', error);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({ message: 'Could not update support ticket.' });
  }
});

module.exports = router;
