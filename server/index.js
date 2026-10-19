require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/database');
const { getHealth } = require('./controllers/health');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
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

const app = express();
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
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
app.use('/api/employees', employeeRoutes);
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
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  await connectDatabase();
  console.log('MongoDB connected');

  app.listen(port, () => console.log(`Server running on port ${port}`));
}

startServer().catch((error) => {
  console.error('Could not start the server:', error.message);
  process.exitCode = 1;
});
