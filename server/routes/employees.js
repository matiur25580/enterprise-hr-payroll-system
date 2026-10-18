const express = require('express');
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
    res.status(201).json(emp);
  }catch(e){
    if (e.code === 11000 && e.keyPattern?.email)
      return res.status(409).json({message:'This email is already registered as an employee.'});
    console.error('Could not add employee:', e);
    res.status(500).json({message:'Could not add employee'});
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
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/:id', verifyToken, async (req,res)=>{
  try{
    const emp = await Employee.findById(req.params.id);
    if(!emp) return res.status(404).json({message:'Not found'});
    if (req.user.role === 'employee' && emp.email.toLowerCase() !== String(req.user.email).toLowerCase())
      return res.status(403).json({message:'Access denied'});
    res.json(emp);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.put('/:id', verifyToken, authorize('admin','hr'), async (req,res)=>{
  try{
    const updates = { ...req.body };
    delete updates.employeeId;
    if (typeof updates.email === 'string') updates.email = updates.email.trim().toLowerCase();
    const emp = await Employee.findByIdAndUpdate(req.params.id, updates, {new:true, runValidators:true});
    if (!emp) return res.status(404).json({message:'Employee not found'});
    const compensationChanged = Object.prototype.hasOwnProperty.call(req.body, 'salary');
    const message = compensationChanged
      ? `${emp.name}'s compensation details were updated.`
      : `${emp.name}'s employee profile was updated.`;
    await recordWorkplaceActivity(req, emp.email, 'employee-updated', message);
    res.json(emp);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.delete('/:id', verifyToken, authorize('admin'), async (req,res)=>{
  try{
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({message:'Employee not found'});
    await recordWorkplaceActivity(req, emp.email, 'employee-removed', `${emp.name}'s employee record was removed.`);
    res.json({message:'Employee deleted'});
  }catch(e){ res.status(500).json({message:e.message}); }
});

module.exports = router;
