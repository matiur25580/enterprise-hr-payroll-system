const mongoose = require('mongoose');
const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, sparse: true, immutable: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
<<<<<<< HEAD
  salary: { type: Number, required: true, min: 0 },
=======
  salary: { type: Number, required: true },
>>>>>>> 41e042fcd913703e99b4dc04bb26337fa33ff018
  joiningDate: { type: Date, default: Date.now }
}, { timestamps: true });
module.exports = mongoose.model('Employee', employeeSchema);
