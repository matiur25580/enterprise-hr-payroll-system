const mongoose = require('mongoose');

// Keep database connection setup in one place so startup fails clearly when MongoDB is unavailable.
async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI must be configured');
  await mongoose.connect(uri);
}

module.exports = connectDatabase;
