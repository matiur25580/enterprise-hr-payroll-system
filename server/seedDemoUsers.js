const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');

const demoUsers = [
  { name: 'System Admin', emailVariable: 'DEMO_ADMIN_EMAIL', passwordVariable: 'DEMO_ADMIN_PASSWORD', userId: 'ADSA01011980', phone: '+15550001001', dateOfBirth: new Date('1980-01-01T00:00:00.000Z'), role: 'admin' },
  { name: 'HR Manager', emailVariable: 'DEMO_HR_EMAIL', passwordVariable: 'DEMO_HR_PASSWORD', userId: 'HRHM02021985', phone: '+15550001002', dateOfBirth: new Date('1985-02-02T00:00:00.000Z'), role: 'hr' },
  { name: 'Employee User', emailVariable: 'DEMO_EMPLOYEE_EMAIL', passwordVariable: 'DEMO_EMPLOYEE_PASSWORD', userId: 'EMEU03031990', phone: '+15550001003', dateOfBirth: new Date('1990-03-03T00:00:00.000Z'), role: 'employee' },
];

async function seedDemoUsers() {
  const configuredUsers = demoUsers.map((demoUser) => {
    const email = process.env[demoUser.emailVariable]?.trim().toLowerCase();
    const password = process.env[demoUser.passwordVariable];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`${demoUser.emailVariable} must contain a valid email address.`);
    }
    if (!password || password.length < 16 || /^replace-with-/i.test(password)) {
      throw new Error(`${demoUser.passwordVariable} must contain a unique, non-placeholder password of at least 16 characters.`);
    }
    return { ...demoUser, email, password };
  });
  if (new Set(configuredUsers.map((user) => user.email)).size !== configuredUsers.length) {
    throw new Error('Demo account email addresses must be unique.');
  }
  if (new Set(configuredUsers.map((user) => user.password)).size !== configuredUsers.length) {
    throw new Error('Demo account passwords must be unique.');
  }

  for (const demoUser of configuredUsers) {
    const password = await bcrypt.hash(demoUser.password, 12);
    let user = await User.findOne({
      email: { $regex: `^${demoUser.email}$`, $options: 'i' },
    });

    const account = {
      name: demoUser.name,
      email: demoUser.email,
      userId: demoUser.userId,
      phone: demoUser.phone,
      dateOfBirth: demoUser.dateOfBirth,
      role: demoUser.role,
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

  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEMO_SEED !== 'true') {
    console.error('Set NODE_ENV=development and ENABLE_DEMO_SEED=true to seed demo accounts.');
    process.exitCode = 1;
  } else {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI must be configured before provisioning demo accounts.');
      process.exitCode = 1;
    } else {
      mongoose.connect(process.env.MONGO_URI)
        .then(seedDemoUsers)
        .then(() => mongoose.disconnect())
        .catch(async (error) => {
          console.error('Could not provision demo accounts:', error);
          await mongoose.disconnect();
          process.exitCode = 1;
        });
    }
  }
}
