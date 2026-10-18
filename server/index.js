require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const activityRoutes = require('./routes/activity');
const leaveRoutes = require('./routes/leaves');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');
const seedDemoUsers = require('./seedDemoUsers');

const { verifyToken, authorize } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);

app.get('/api/admin-only', verifyToken, authorize('admin'), (req, res) => {
  res.json({ message: `Welcome admin ${req.user.id}` });
  });

  app.get('/', (req,res)=> res.json({ok:true}));

  const PORT = process.env.PORT || 5000;
  const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_USERS === 'true') {
    await seedDemoUsers();
  } else {
    console.log('Demo accounts are disabled in production');
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer().catch((error) => {
  console.error('Could not start the server:', error);
  process.exitCode = 1;
});