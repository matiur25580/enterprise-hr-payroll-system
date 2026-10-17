require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { verifyToken, authorize } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB error:', err.message));

    app.use('/api/auth', authRoutes);
    const employeeRoutes = require('./routes/employees');
    app.use('/api/employees', employeeRoutes);

    app.get('/api/admin-only', verifyToken, authorize('admin'), (req, res) => {
      res.json({ message: `Welcome admin ${req.user.id}` });
      });

      app.get('/api/hr-only', verifyToken, authorize('admin', 'hr'), (req, res) => {
        res.json({ message: `Hello ${req.user.role} ${req.user.id}` });
        });

        app.get('/api/me', verifyToken, (req, res) => {
          res.json({ user: req.user });
          });

          app.get('/api/health', (req, res) => {
            res.json({ status: "HR Payroll API running" });
            });

            const PORT = process.env.PORT || 5000;
            app.listen(PORT, () => console.log(`Server running on port ${PORT}`));