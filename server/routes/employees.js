const express = require('express');
<<<<<<< HEAD
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordWorkplaceActivity = require('../utils/activity');
const recordAudit = require('../utils/audit');
const router = express.Router();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fields = ['name', 'email', 'department', 'designation', 'salary', 'joiningDate'];

function validateEmployee(data, partial = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'Employee data must be an object.' };
  const updates = {};
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
    updates[field] = data[field];
  }
  if (!partial && fields.slice(0, 5).some((field) => !Object.prototype.hasOwnProperty.call(updates, field))) {
    return { error: 'Name, email, department, designation, and salary are required.' };
  }
  for (const field of ['name', 'department', 'designation']) {
    if (!(field in updates)) continue;
    if (typeof updates[field] !== 'string' || !updates[field].trim() || updates[field].trim().length > 120) {
      return { error: `${field} must be a non-empty string of at most 120 characters.` };
    }
    updates[field] = updates[field].trim();
  }
  if ('email' in updates) {
    if (typeof updates.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email.trim())) {
      return { error: 'Enter a valid employee email address.' };
    }
    updates.email = updates.email.trim().toLowerCase();
  }
  if ('salary' in updates) {
    const salary = updates.salary === '' ? NaN : Number(updates.salary);
    if (!Number.isFinite(salary) || salary < 0) return { error: 'Salary must be a valid non-negative number.' };
    updates.salary = salary;
  }
  if ('joiningDate' in updates) {
    const date = new Date(updates.joiningDate);
    if (!Number.isFinite(date.getTime())) return { error: 'Joining date must be valid.' };
    updates.joiningDate = date;
  }
  return { updates };
}

router.get('/directory', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const employees = await Employee.find({})
      .select('name email department designation')
      .sort({ name: 1 })
      .limit(1000)
      .lean();
    res.json(employees);
  } catch (error) {
    console.error('Could not load team directory:', error);
    res.status(500).json({ message: 'Could not load team directory.' });
  }
});

router.post('/bulk', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  if (!Array.isArray(req.body?.employees) || req.body.employees.length < 1 || req.body.employees.length > 200) {
    return res.status(400).json({ message: 'Provide between 1 and 200 employee rows.' });
  }
  const created = [];
  const rejected = [];
  for (const [index, row] of req.body.employees.entries()) {
    const result = row && typeof row === 'object' && !Array.isArray(row)
      ? validateEmployee(row)
      : { error: 'Employee row must be an object.' };
    if (result.error) {
      rejected.push({ row: index + 1, reason: result.error });
      continue;
    }
    try {
      const employee = new Employee(result.updates);
      employee.employeeId = `EMP-${employee._id.toString().toUpperCase()}`;
      await employee.save();
      await recordWorkplaceActivity(req, employee.email, 'employee-added', `${employee.name} was added to the employee directory.`);
      await recordAudit(req, 'created', 'employee', employee._id, `Added employee ${employee.name}.`);
      created.push({ employeeId: employee.employeeId, email: employee.email });
    } catch (error) {
      if (error.code === 11000) rejected.push({ row: index + 1, reason: 'An employee with this email already exists.' });
      else if (error.name === 'ValidationError' || error.name === 'CastError') {
        rejected.push({ row: index + 1, reason: 'Employee data is invalid.' });
      } else {
        console.error(`Could not import employee row ${index + 1}:`, error);
        return res.status(500).json({ message: 'Could not complete the employee import.' });
      }
    }
  }
  res.status(201).json({
    message: `Imported ${created.length} employee(s); ${rejected.length} row(s) need attention.`,
    created,
    rejected,
  });
});

router.post('/', verifyToken, authorize('admin','hr'), async (req,res)=>{
  try{
    const result = validateEmployee(req.body);
    if (result.error) return res.status(400).json({ message: result.error });
    const emp = new Employee(result.updates);
    emp.employeeId = `EMP-${emp._id.toString().toUpperCase()}`;
    await emp.save();
    await recordWorkplaceActivity(req, emp.email, 'employee-added', `${emp.name} was added to the employee directory.`);
    await recordAudit(req, 'created', 'employee', emp._id, `Added employee ${emp.name}.`);
=======
const Employee = require('../models/Employee');
const { verifyToken, authorize } = require('../middleware/auth');
const recordWorkplaceActivity = require('../utils/activity');
const router = express.Router();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.post('/', verifyToken, authorize('admin','hr'), async (req,res)=>{
  try{
    const employeeData = { ...req.body };
    if (typeof employeeData.email === 'string') employeeData.email = employeeData.email.trim().toLowerCase();
    delete employeeData.employeeId;
    const emp = new Employee(employeeData);
    emp.employeeId = `EMP-${emp._id.toString().toUpperCase()}`;
    await emp.save();
    await recordWorkplaceActivity(req, emp.email, 'employee-added', `${emp.name} was added to the employee directory.`);
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
    res.status(201).json(emp);
  }catch(e){
    if (e.code === 11000 && e.keyPattern?.email)
      return res.status(409).json({message:'This email is already registered as an employee.'});
    console.error('Could not add employee:', e);
<<<<<<< HEAD
    res.status(e.name === 'ValidationError' ? 400 : 500).json({message: e.name === 'ValidationError' ? 'Employee data is invalid.' : 'Could not add employee'});
=======
    res.status(500).json({message:'Could not add employee'});
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
  }
});

router.get('/', verifyToken, async (req,res)=>{
  try{
    if (req.user.role === 'employee' && !req.user.email)
      return res.status(401).json({message:'Please sign in again'});
    const emps = await Employee.find(
      req.user.role === 'employee'
        ? { email: { $regex: `^${escapeRegExp(String(req.user.email).toLowerCase())}$`, $options: 'i' } }
        : {}
    );
    res.json(emps);
<<<<<<< HEAD
  }catch(e){ console.error('Could not load employees:', e); res.status(500).json({message:'Could not load employees'}); }
});

router.get('/:id', verifyToken, async (req,res)=>{
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid employee ID.' });
=======
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/:id', verifyToken, async (req,res)=>{
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
  try{
    const emp = await Employee.findById(req.params.id);
    if(!emp) return res.status(404).json({message:'Not found'});
    if (req.user.role === 'employee' && emp.email.toLowerCase() !== String(req.user.email).toLowerCase())
      return res.status(403).json({message:'Access denied'});
    res.json(emp);
<<<<<<< HEAD
  }catch(e){ console.error('Could not load employee:', e); res.status(500).json({message:'Could not load employee'}); }
=======
  }catch(e){ res.status(500).json({message:e.message}); }
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
});

router.put('/:id', verifyToken, authorize('admin','hr'), async (req,res)=>{
  try{
<<<<<<< HEAD
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid employee ID.' });
    const result = validateEmployee(req.body, true);
    if (result.error || !Object.keys(result.updates).length) return res.status(400).json({ message: result.error || 'Provide at least one valid field to update.' });
    const emp = await Employee.findByIdAndUpdate(req.params.id, result.updates, {new:true, runValidators:true});
=======
    const updates = { ...req.body };
    delete updates.employeeId;
    if (typeof updates.email === 'string') updates.email = updates.email.trim().toLowerCase();
    const emp = await Employee.findByIdAndUpdate(req.params.id, updates, {new:true, runValidators:true});
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
    if (!emp) return res.status(404).json({message:'Employee not found'});
    const compensationChanged = Object.prototype.hasOwnProperty.call(req.body, 'salary');
    const message = compensationChanged
      ? `${emp.name}'s compensation details were updated.`
      : `${emp.name}'s employee profile was updated.`;
    await recordWorkplaceActivity(req, emp.email, 'employee-updated', message);
<<<<<<< HEAD
    await recordAudit(req, 'updated', 'employee', emp._id, `Updated employee ${emp.name}.`);
    res.json(emp);
  }catch(e){ console.error('Could not update employee:', e); res.status(e.name === 'ValidationError' ? 400 : 500).json({message: e.name === 'ValidationError' ? 'Employee data is invalid.' : 'Could not update employee'}); }
=======
    res.json(emp);
  }catch(e){ res.status(500).json({message:e.message}); }
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
});

router.delete('/:id', verifyToken, authorize('admin'), async (req,res)=>{
  try{
<<<<<<< HEAD
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid employee ID.' });
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({message:'Employee not found'});
    await recordWorkplaceActivity(req, emp.email, 'employee-removed', `${emp.name}'s employee record was removed.`);
    await recordAudit(req, 'deleted', 'employee', emp._id, `Removed employee ${emp.name}.`);
    res.json({message:'Employee deleted'});
  }catch(e){ console.error('Could not delete employee:', e); res.status(500).json({message:'Could not delete employee'}); }
=======
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({message:'Employee not found'});
    await recordWorkplaceActivity(req, emp.email, 'employee-removed', `${emp.name}'s employee record was removed.`);
    res.json({message:'Employee deleted'});
  }catch(e){ res.status(500).json({message:e.message}); }
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
});

module.exports = router;
