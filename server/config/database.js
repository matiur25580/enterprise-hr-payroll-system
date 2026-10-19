const mongoose = require('mongoose');

async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI must be configured');
  await mongoose.connect(uri);
}

module.exports = connectDatabase;
