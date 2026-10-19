#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const crypto = require('node:crypto');
const readline = require('node:readline/promises');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{14,72}$/;

function validatePassword(password) {
  return typeof password === 'string'
    && Buffer.byteLength(password, 'utf8') <= 72
    && strongPasswordPattern.test(password);
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Password prompts require an interactive terminal.'));
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = '';
    let settled = false;

    const cleanup = () => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
    };
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(result);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish(new Error('Input cancelled.'));
          return;
        }
        if (character === '\u0004') {
          finish(new Error('Input ended.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish(null, value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          if (value.length) {
            value = Array.from(value).slice(0, -1).join('');
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ' && character !== '\u007f') {
          value += character;
          process.stdout.write('*');
        }
      }
    };

    process.stdout.write(prompt);
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

async function promptForAdmin() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command from an interactive terminal.');
  }

  const prompts = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const name = (await prompts.question('Admin name: ')).trim().replace(/\s+/g, ' ');
    const email = (await prompts.question('Admin email: ')).trim().toLowerCase();
    if (!name || name.length > 120) throw new Error('Name must be between 1 and 120 characters.');
    if (!emailPattern.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
    return { name, email };
  } finally {
    prompts.close();
  }
}

async function createFirstAdmin({ name, email, password }) {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured in server/.env.');
  if (!validatePassword(password)) {
    throw new Error('Password must be 14–72 characters (at most 72 UTF-8 bytes) and include uppercase, lowercase, a number and a symbol, with no spaces.');
  }

  try {
    await mongoose.connection.db.createCollection('adminprovisionlocks');
  } catch (error) {
    if (error.code !== 48) throw error;
  }
  const provisionLocks = mongoose.connection.collection('adminprovisionlocks');
  const session = await mongoose.startSession();
  try {
    let createdAdmin;
    await session.withTransaction(async () => {
      const existingAdmin = await User.exists({ role: 'admin' }).session(session);
      if (existingAdmin) throw new Error('An Admin account already exists; first-Admin provisioning is disabled.');

      await provisionLocks.insertOne({
        _id: 'first-admin',
        email,
        createdAt: new Date(),
      }, { session });
      const userId = `AD${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
      const passwordHash = await bcrypt.hash(password, 12);
      [createdAdmin] = await User.create([{
        name,
        email,
        userId,
        password: passwordHash,
        role: 'admin',
        status: 'active',
      }], { session });
    }, {
      readPreference: 'primary',
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });

    return createdAdmin;
  } finally {
    await session.endSession();
  }
}

async function main() {
  let exitCode = 0;
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured in server/.env.');
    const { name, email } = await promptForAdmin();
    const password = await readHidden('Admin password: ');
    const confirmation = await readHidden('Confirm password: ');
    if (password !== confirmation) throw new Error('Passwords do not match.');
    if (!validatePassword(password)) {
      throw new Error('Password must be 14–72 characters (at most 72 UTF-8 bytes) and include uppercase, lowercase, a number and a symbol, with no spaces.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    const admin = await createFirstAdmin({ name, email, password });
    console.log(`Admin account created successfully. Account ID: ${admin.userId}`);
  } catch (error) {
    const message = error.code === 11000
      ? 'First-Admin provisioning was already claimed or the email address is already registered.'
      : error.message;
    console.error(`Could not provision Admin: ${message}`);
    exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
  process.exitCode = exitCode;
}

if (require.main === module) {
  void main();
}

module.exports = { validatePassword };
