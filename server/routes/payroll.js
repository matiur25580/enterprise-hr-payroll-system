const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const { verifyToken } = require('../middleware/auth');

router.post('/generate', verifyToken, async (req,res)=>{
  try{
    const { employeeId, month, basic, bonus=0, deduction=0 } = req.body;
    const net = Number(basic) + Number(bonus) - Number(deduction);
    const p = new Payroll({ employeeId, month, basic, bonus, deduction, net });
    await p.save();
    res.json(p);
  }catch(e){ res.status(500).json({error:e.message}); }
});

router.get('/', verifyToken, async (req,res)=>{
  res.json(await Payroll.find().populate('employeeId').sort({createdAt:-1}));
});

module.exports = router;
