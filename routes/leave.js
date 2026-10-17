const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const auth = require('../middleware/auth');

router.post('/', auth, async (req,res)=>{
  try{
    const leave = new Leave(req.body);
    await leave.save();
    res.json(leave);
  }catch(e){ res.status(500).json({error:e.message}); }
});

router.get('/', auth, async (req,res)=>{
  const leaves = await Leave.find().populate('employeeId');
  res.json(leaves);
});

module.exports = router;
