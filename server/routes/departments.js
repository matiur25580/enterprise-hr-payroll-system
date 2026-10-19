const express = require('express');
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordAudit = require('../utils/audit');

const router = express.Router();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 }).lean();
    const results = await Promise.all(departments.map(async (department) => ({
      ...department,
      employeeCount: await Employee.countDocuments({
        department: { $regex: `^${escapeRegExp(department.name)}$`, $options: 'i' },
      }),
    })));
    res.json(results);
  } catch (error) {
    console.error('Could not load departments:', error);
    res.status(500).json({ message: 'Could not load departments.' });
  }
});

router.post('/', verifyToken, authorize('admin'), async (req, res) => {
  const { name, description } = req.body;
  if (
    typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120
    || (description !== undefined && (typeof description !== 'string' || description.trim().length > 500))
  ) {
    return res.status(400).json({ message: 'Enter a department name of 2–120 characters and an optional description of at most 500 characters.' });
  }
  try {
    const department = await Department.create({
      name: name.trim(),
      normalizedName: name.trim().toLowerCase(),
      description: description?.trim() ?? '',
      createdByEmail: req.user.email,
    });
    await recordAudit(req, 'created', 'department', department._id, `Created the ${department.name} department.`);
    res.status(201).json({ ...department.toObject(), employeeCount: 0 });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A department with this name already exists.' });
    console.error('Could not create department:', error);
    res.status(500).json({ message: 'Could not create department.' });
  }
});

router.delete('/:id', verifyToken, authorize('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid department ID.' });
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    const employeeCount = await Employee.countDocuments({
      department: { $regex: `^${escapeRegExp(department.name)}$`, $options: 'i' },
    });
    if (employeeCount) {
      return res.status(409).json({ message: 'Move or remove employees assigned to this department before deleting it.' });
    }
    await department.deleteOne();
    await recordAudit(req, 'deleted', 'department', department._id, `Deleted the ${department.name} department.`);
    res.json({ message: 'Department deleted.' });
  } catch (error) {
    console.error('Could not delete department:', error);
    res.status(500).json({ message: 'Could not delete department.' });
  }
});

module.exports = router;
