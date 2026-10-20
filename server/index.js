require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const connectDatabase = require('./config/database');
const { getHealth } = require('./controllers/health');
const Employee = require('./models/Employee');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const userRoutes = require('./routes/users');
const activityRoutes = require('./routes/activity');
const leaveRoutes = require('./routes/leaves');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');
const auditRoutes = require('./routes/audit');
const announcementRoutes = require('./routes/announcements');
const supportRoutes = require('./routes/support');
const performanceRoutes = require('./routes/performance');
const peopleRoutes = require('./routes/people');
const departmentRoutes = require('./routes/departments');
const analyticsRoutes = require('./routes/analytics');
const documentRoutes = require('./routes/documents');
const { verifyToken, authorize } = require('./middlewares/auth');
const authMiddleware = verifyToken;

const app = express();

app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});
app.use('/api/auth', authRoutes);
app.get('/api/employees', authMiddleware, async (req, res) => {
  try {
    const employees = await Employee.find(
      req.user.role === 'employee' ? { email: req.user.email } : {},
    );
    return res.json(employees);
  } catch (error) {
    console.error('Could not load employees:', error);
    return res.status(500).json({ message: error.message });
  }
});
app.post('/api/employees', authMiddleware, authorize('admin', 'hr'), async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
  const designation = typeof req.body.designation === 'string' ? req.body.designation.trim() : '';
  const password = req.body.password;
  const role = typeof req.body.role === 'string' ? req.body.role.trim().toLowerCase() : '';
  const salary = req.body.salary === '' ? NaN : Number(req.body.salary);
  const allowedRoles = req.user.role === 'admin' ? ['admin', 'hr', 'employee'] : ['employee'];

  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !department || department.length > 120 || !designation || designation.length > 120
    || !Number.isFinite(salary) || salary < 0
    || typeof password !== 'string' || password.length < 6 || password.length > 128
    || !allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Provide valid employee details, a password (6-128 characters), and an allowed role.' });
  }

  let user;
  try {
    const [existingUser, existingEmployee] = await Promise.all([
      User.exists({ email }),
      Employee.exists({ email }),
    ]);
    if (existingUser || existingEmployee) {
      return res.status(409).json({ message: 'An account or employee record with this email already exists.' });
    }

    user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      status: 'active',
      department,
      designation,
      salary,
    });
    await user.save();

    const employee = new Employee({ name, email, department, designation, salary });
    employee.employeeId = `EMP-${employee._id.toString().toUpperCase()}`;
    await employee.save();
    return res.status(201).json({ ...employee.toObject(), role: user.role });
  } catch (error) {
    if (user) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (cleanupError) {
        console.error('Could not roll back user after employee creation failed:', cleanupError);
      }
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account or employee record with this email already exists.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Employee or account data is invalid.' });
    }
    console.error('Could not create employee and account:', error);
    return res.status(500).json({ message: 'Could not create the employee and account.' });
  }
});
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/documents', documentRoutes);

app.get('/api/admin-only', verifyToken, authorize('admin'), (req, res) => {
  res.json({ message: `Welcome admin ${req.user.id}` });
});
app.get('/api/health', getHealth);
app.get('/', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must contain valid JSON' });
  if (error.message === 'Origin is not allowed by CORS') return res.status(403).json({ message: error.message });
  console.error('Unhandled request error:', error);
  return res.status(500).json({ message: 'An unexpected server error occurred' });
});

async function startServer() {
  if (typeof process.env.JWT_SECRET !== 'string' || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  const PORT = Number(process.env.PORT || 5000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be a valid TCP port');

  await connectDatabase(process.env.MONGO_URI);
  console.log('MongoDB connected');

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer().catch((error) => {
  console.error('Could not start the server:', error.message);
  process.exitCode = 1;
});
