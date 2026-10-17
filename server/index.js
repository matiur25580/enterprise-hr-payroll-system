require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB error:', err.message));

    app.get('/api/health', (req,res)=>{
      res.json({status:"HR Payroll API running", db: mongoose.connection.readyState === 1 ? "connected" : "not connected"});
      });

      const PORT = process.env.PORT || 5000;
      app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));