const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');

const demoUsers = [
  { name: 'System Admin', email: 'admin@company.com', userId: 'ADSA01011980', phone: '+15550001001', dateOfBirth: new Date('1980-01-01T00:00:00.000Z'), password: 'admin123', role: 'admin' },
  { name: 'HR Manager', email: 'hr@company.com', userId: 'HRHM02021985', phone: '+15550001002', dateOfBirth: new Date('1985-02-02T00:00:00.000Z'), password: 'hr123', role: 'hr' },
  { name: 'Employee User', email: 'employee@company.com', userId: 'EMEU03031990', phone: '+15550001003', dateOfBirth: new Date('1990-03-03T00:00:00.000Z'), password: 'emp123', role: 'employee' },
];

async function seedDemoUsers() {
  for (const demoUser of demoUsers) {
    const password = await bcrypt.hash(demoUser.password, 10);
    let user = await User.findOne({
      email: { $regex: `^${demoUser.email}$`, $options: 'i' },
    });

    const account = {
      ...demoUser,
      password,
    };
    if (user) {
      await User.collection.updateOne({ _id: user._id }, { $set: account });
    } else {
      await User.create(account);
    }
  }

  console.log('Demo accounts are ready');
}

module.exports = seedDemoUsers;

if (require.main === module) {
  require('dotenv').config();

  mongoose.connect(process.env.MONGO_URI)
    .then(seedDemoUsers)
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error('Could not provision demo accounts:', error);
      await mongoose.disconnect();
      process.exitCode = 1;
    });
}
