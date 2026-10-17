const express = require('express');
const Employee = require('../models/Employee');
const { verifyToken, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/', verifyToken, authorize('admin','hr'), async (req,res)=>{
  try{
    const emp = await Employee.create(req.body);
    res.status(201).json(emp);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/', verifyToken, async (req,res)=>{
  try{
    const emps = await Employee.find();
    res.json(emps);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.get('/:id', verifyToken, async (req,res)=>{
  try{
    const emp = await Employee.findById(req.params.id);
    if(!emp) return res.status(404).json({message:'Not found'});
    res.json(emp);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.put('/:id', verifyToken, authorize('admin','hr'), async (req,res)=>{
  try{
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, {new:true});
    res.json(emp);
  }catch(e){ res.status(500).json({message:e.message}); }
});

router.delete('/:id', verifyToken, authorize('admin'), async (req,res)=>{
  try{
    await Employee.findByIdAndDelete(req.params.id);
    res.json({message:'Employee deleted'});
  }catch(e){ res.status(500).json({message:e.message}); }
});

module.exports = router;
