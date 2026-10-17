require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');

let leaveRoutes = null;
try { leaveRoutes = require('./routes/leave'); } catch(e){ console.log('leave route not found, skipping'); }

const { verifyToken, authorize } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
if (leaveRoutes) app.use('/api/leaves', leaveRoutes);

app.get('/api/admin-only', verifyToken, authorize('admin'), (req, res) => {
  res.json({ message: `Welcome admin ${req.user.id}` });
  });

  app.get('/', (req,res)=> res.json({ok:true}));

  const PORT = process.env.PORT || 5000;
  const MONGO_URI = process.env.MONGO_URI;

  mongoose.connect(MONGO_URI)
    .then(()=> {
        console.log('MongoDB connected');
            app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
              })
                .catch(err=> console.error(err));