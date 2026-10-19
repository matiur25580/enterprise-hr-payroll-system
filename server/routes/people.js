const express = require('express');
const mongoose = require('mongoose');
const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const OnboardingTask = require('../models/OnboardingTask');
const Shift = require('../models/Shift');
const TrainingRecord = require('../models/TrainingRecord');
const { verifyToken, authorize } = require('../middleware/auth');
const recordAudit = require('../utils/audit');

const router = express.Router();
const candidateStages = new Set(['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']);
const trainingStatuses = new Set(['Assigned', 'In Progress', 'Completed']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function validDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

router.get('/candidates', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const candidates = await Candidate.find({}).sort({ updatedAt: -1 }).limit(1000).lean();
    res.json(candidates);
  } catch (error) {
    console.error('Could not load candidates:', error);
    res.status(500).json({ message: 'Could not load candidates.' });
  }
});

router.post('/candidates', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  const { name, email, position, source } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (
    typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120
    || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    || typeof position !== 'string' || position.trim().length < 2 || position.trim().length > 120
    || (source !== undefined && (typeof source !== 'string' || source.trim().length > 120))
  ) {
    return res.status(400).json({ message: 'Enter a valid candidate name, email, position, and optional source.' });
  }
  try {
    const candidate = await Candidate.create({
      name: name.trim(),
      email: normalizedEmail,
      position: position.trim(),
      source: typeof source === 'string' ? source.trim() : '',
      createdByEmail: req.user.email,
    });
    await recordAudit(req, 'created', 'candidate', candidate._id, `Added ${candidate.name} to the ${candidate.position} pipeline.`);
    res.status(201).json(candidate);
  } catch (error) {
    console.error('Could not add candidate:', error);
    res.status(500).json({ message: 'Could not add candidate.' });
  }
});

router.patch('/candidates/:id', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid candidate ID.' });
  if (!candidateStages.has(req.body.stage)) return res.status(400).json({ message: 'Select a valid hiring stage.' });
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { $set: { stage: req.body.stage } },
      { new: true, runValidators: true },
    );
    if (!candidate) return res.status(404).json({ message: 'Candidate not found.' });
    await recordAudit(req, 'updated', 'candidate', candidate._id, `Moved ${candidate.name} to ${candidate.stage}.`);
    res.json(candidate);
  } catch (error) {
    console.error('Could not update candidate stage:', error);
    res.status(500).json({ message: 'Could not update candidate stage.' });
  }
});

router.get('/onboarding', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const tasks = await OnboardingTask.find(query).sort({ dueDate: 1, createdAt: -1 }).limit(1000).lean();
    res.json(tasks);
  } catch (error) {
    console.error('Could not load onboarding tasks:', error);
    res.status(500).json({ message: 'Could not load onboarding tasks.' });
  }
});

router.post('/onboarding', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  const { employeeId, title, dueDate } = req.body;
  if (
    typeof employeeId !== 'string' || !mongoose.isValidObjectId(employeeId)
    || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 160
    || (dueDate !== undefined && dueDate !== '' && (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)))
  ) {
    return res.status(400).json({ message: 'Select an employee and enter a valid onboarding task and optional due date.' });
  }
  let parsedDueDate;
  if (dueDate) {
    parsedDueDate = new Date(`${dueDate}T00:00:00.000Z`);
    if (!Number.isFinite(parsedDueDate.getTime()) || parsedDueDate.toISOString().slice(0, 10) !== dueDate) {
      return res.status(400).json({ message: 'Enter a valid onboarding due date.' });
    }
  }
  try {
    const employee = await Employee.findById(employeeId).select('_id name email');
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    const task = await OnboardingTask.create({
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      title: title.trim(),
      ...(parsedDueDate ? { dueDate: parsedDueDate } : {}),
      createdByEmail: req.user.email,
    });
    await recordAudit(req, 'created', 'onboarding-task', task._id, `Assigned an onboarding task to ${employee.name}.`);
    res.status(201).json(task);
  } catch (error) {
    console.error('Could not create onboarding task:', error);
    res.status(500).json({ message: 'Could not create onboarding task.' });
  }
});

router.patch('/onboarding/:id', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid onboarding task ID.' });
  if (!['Pending', 'Completed'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Select a valid onboarding task status.' });
  }
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'employee') query.employeeEmail = String(req.user.email).toLowerCase();
    const task = await OnboardingTask.findOneAndUpdate(
      query,
      {
        $set: {
          status: req.body.status,
          completedAt: req.body.status === 'Completed' ? new Date() : null,
        },
      },
      { new: true, runValidators: true },
    );
    if (!task) return res.status(404).json({ message: 'Onboarding task not found.' });
    await recordAudit(req, 'updated', 'onboarding-task', task._id, `Updated onboarding task status for ${task.employeeName}.`);
    res.json(task);
  } catch (error) {
    console.error('Could not update onboarding task:', error);
    res.status(500).json({ message: 'Could not update onboarding task.' });
  }
});

router.get('/shifts', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const shifts = await Shift.find(query).sort({ date: 1, startTime: 1 }).limit(1000).lean();
    res.json(shifts);
  } catch (error) {
    console.error('Could not load shift schedule:', error);
    res.status(500).json({ message: 'Could not load shift schedule.' });
  }
});

router.post('/shifts', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  const { employeeId, date, startTime, endTime, notes } = req.body;
  if (
    typeof employeeId !== 'string' || !mongoose.isValidObjectId(employeeId)
    || !validDate(date)
    || typeof startTime !== 'string' || !timePattern.test(startTime)
    || typeof endTime !== 'string' || !timePattern.test(endTime) || endTime === startTime
    || (notes !== undefined && (typeof notes !== 'string' || notes.trim().length > 500))
  ) {
    return res.status(400).json({ message: 'Select an employee and enter a valid date, distinct shift times, and optional note.' });
  }
  try {
    const employee = await Employee.findById(employeeId).select('_id name email');
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    const shift = await Shift.create({
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      date,
      startTime,
      endTime,
      notes: notes?.trim() ?? '',
      createdByEmail: req.user.email,
    });
    await recordAudit(req, 'created', 'shift', shift._id, `Scheduled a shift for ${employee.name} on ${date}.`);
    res.status(201).json(shift);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A shift already exists for this employee and start time.' });
    console.error('Could not schedule shift:', error);
    res.status(500).json({ message: 'Could not schedule shift.' });
  }
});

router.get('/training', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { employeeEmail: String(req.user.email).toLowerCase() }
      : {};
    const records = await TrainingRecord.find(query).sort({ dueDate: 1, createdAt: -1 }).limit(1000).lean();
    res.json(records);
  } catch (error) {
    console.error('Could not load training records:', error);
    res.status(500).json({ message: 'Could not load training records.' });
  }
});

router.post('/training', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  const { employeeId, course, provider, dueDate } = req.body;
  if (
    typeof employeeId !== 'string' || !mongoose.isValidObjectId(employeeId)
    || typeof course !== 'string' || course.trim().length < 2 || course.trim().length > 160
    || (provider !== undefined && (typeof provider !== 'string' || provider.trim().length > 120))
    || (dueDate !== undefined && dueDate !== '' && !validDate(dueDate))
  ) {
    return res.status(400).json({ message: 'Select an employee and enter a valid course, provider, and optional due date.' });
  }
  try {
    const employee = await Employee.findById(employeeId).select('_id name email');
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    const record = await TrainingRecord.create({
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      course: course.trim(),
      provider: provider?.trim() ?? '',
      ...(dueDate ? { dueDate: new Date(`${dueDate}T00:00:00.000Z`) } : {}),
      createdByEmail: req.user.email,
    });
    await recordAudit(req, 'created', 'training-record', record._id, `Assigned ${record.course} training to ${employee.name}.`);
    res.status(201).json(record);
  } catch (error) {
    console.error('Could not assign training:', error);
    res.status(500).json({ message: 'Could not assign training.' });
  }
});

router.patch('/training/:id', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid training record ID.' });
  if (!trainingStatuses.has(req.body.status)) return res.status(400).json({ message: 'Select a valid training status.' });
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'employee') query.employeeEmail = String(req.user.email).toLowerCase();
    const record = await TrainingRecord.findOneAndUpdate(
      query,
      {
        $set: {
          status: req.body.status,
          completedAt: req.body.status === 'Completed' ? new Date() : null,
        },
      },
      { new: true, runValidators: true },
    );
    if (!record) return res.status(404).json({ message: 'Training record not found.' });
    await recordAudit(req, 'updated', 'training-record', record._id, `Updated ${record.employeeName}'s training status to ${record.status}.`);
    res.json(record);
  } catch (error) {
    console.error('Could not update training status:', error);
    res.status(500).json({ message: 'Could not update training status.' });
  }
});

module.exports = router;
