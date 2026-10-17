const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { verifyToken } = require('../middleware/auth');
router.post('/checkin', verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date(); today.setHours(0,0,0,0);
    let att = await Attendance.findOne({ employee: employeeId, date: { $gte: today } });
    if (att) return res.status(400).json({ message: 'Already checked in today' });
    att = new Attendance({ employee: employeeId, date: new Date(), checkIn: new Date() });
    await att.save(); res.json(att);
  } catch(e){ res.status(500).json({message:e.message}); }
});
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date(); today.setHours(0,0,0,0);
    const att = await Attendance.findOne({ employee: employeeId, date: { $gte: today } });
    if (!att) return res.status(404).json({ message: 'No check-in found today' });
    att.checkOut = new Date(); await att.save(); res.json(att);
  } catch(e){ res.status(500).json({message:e.message}); }
});
router.get('/:employeeId', verifyToken, async (req,res)=>{
  try{ const list = await Attendance.find({ employee: req.params.employeeId }).sort({date:-1}); res.json(list);
  }catch(e){ res.status(500).json({message:e.message}); }
});
module.exports = router;
