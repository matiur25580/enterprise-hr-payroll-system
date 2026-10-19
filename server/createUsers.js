#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('node:path').resolve(__dirname, '.env') });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured in server/.env.');
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_PASSWORD in the environment; do not store the admin password in source code.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const existingAdmin = await User.exists({ email: 'admin@company.com' });
  if (existingAdmin) throw new Error('admin@company.com is already registered.');

  const user = await User.create({
    name: 'Admin',
    email: 'admin@company.com',
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    role: 'admin',
    status: 'active',
  });

  console.log(`Admin account created successfully: ${user.email}`);
}

if (require.main === module) {
  createAdmin()
    .catch((error) => {
      console.error(`Could not create admin account: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}

module.exports = { createAdmin };
