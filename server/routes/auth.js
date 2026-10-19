const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailChallenge = require('../models/EmailChallenge');
const sendOtpEmail = require('../utils/email');
const createRateLimit = require('../middlewares/rateLimit');
const { verifyToken } = require('../middlewares/auth');

const router = express.Router();
const OTP_LIFETIME_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const rolePrefixes = { admin: 'AD', hr: 'HR', employee: 'EM' };
const loginRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many sign-in attempts. Try again later.' });
const otpRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many verification requests. Try again later.' });

router.get('/session', verifyToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeUserId(userId) {
  return typeof userId === 'string' ? userId.trim().toUpperCase() : '';
}

function makeOtp() {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0');
}

function parseBirthDate(value) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return null;
  const day = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const year = Number(value.slice(4, 8));
  if (year < 1900) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
    || date.getTime() > Date.now()
  ) return null;
  return date;
}

function normalizePhone(phone) {
  if (typeof phone !== 'string') return '';
  if (!/^[+\d\s().-]+$/.test(phone)) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? `+${digits}` : '';
}

function accountIdBase(name, role, birthDate) {
  const initials = name.trim().split(/\s+/);
  if (initials.length < 2) return null;
  const cleanInitial = (part) => part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]/i)?.[0]?.toUpperCase() || 'X';
  const day = String(birthDate.getUTCDate()).padStart(2, '0');
  const month = String(birthDate.getUTCMonth() + 1).padStart(2, '0');
  const year = birthDate.getUTCFullYear();
  return `${rolePrefixes[role]}${cleanInitial(initials[0])}${cleanInitial(initials[initials.length - 1])}${day}${month}${year}`;
}

async function saveChallenge({ email, purpose, pendingSignup, userId }) {
  const currentChallenge = await EmailChallenge.findOne({ email, purpose }).select('resendAfter').lean();
  if (currentChallenge?.resendAfter && currentChallenge.resendAfter.getTime() > Date.now()) {
    const error = new Error('Please wait before requesting another code.');
    error.status = 429;
    throw error;
  }

  const code = makeOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const now = Date.now();
  const update = {
    codeHash,
    expiresAt: new Date(now + OTP_LIFETIME_MS),
    resendAfter: new Date(now + OTP_LIFETIME_MS),
    attempts: 0,
  };
  if (pendingSignup) update.pendingSignup = pendingSignup;
  if (userId) update.userId = userId;

  const challenge = await EmailChallenge.findOneAndUpdate(
    { email, purpose },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  try {
    await sendOtpEmail(email, code, purpose);
  } catch (error) {
    console.error('Could not send verification email:', error);
    await EmailChallenge.deleteOne({ _id: challenge._id, codeHash });
    const deliveryError = new Error('Email delivery failed');
    deliveryError.status = 503;
    throw deliveryError;
  }
}

async function isDuplicateContact(email, phone) {
  const matches = await User.findOne({ $or: [{ email }, { phone }] }).select('_id email phone').lean();
  if (!matches) return null;
  return matches.email === email ? 'This email is already registered. Please log in.' : 'This phone number is already registered. Please log in.';
}

async function consumeOtp(challenge, code) {
  if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= MAX_OTP_ATTEMPTS) {
    if (challenge) await EmailChallenge.deleteOne({ _id: challenge._id });
    return false;
  }
  const attempt = await EmailChallenge.findOneAndUpdate(
    { _id: challenge._id, attempts: { $lt: MAX_OTP_ATTEMPTS }, expiresAt: { $gt: new Date() } },
    { $inc: { attempts: 1 } },
    { new: true },
  ).select('codeHash');
  return Boolean(attempt && await bcrypt.compare(code, attempt.codeHash));
}

router.post('/register/request-otp', otpRateLimit, async (req, res) => {
  try {
    const { name, dateOfBirth, password, confirmPassword } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    const normalizedRole = 'employee';
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const birthDate = parseBirthDate(dateOfBirth);

    if (!normalizedName || normalizedName.length > 120 || !email || !phone || !birthDate
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !accountIdBase(normalizedName, normalizedRole, birthDate)
      || typeof password !== 'string' || password.length < 8 || password.length > 128 || password !== confirmPassword) {
      return res.status(400).json({ message: 'Complete every field with valid information. Passwords must match and contain at least 8 characters.' });
    }

    const duplicateMessage = await isDuplicateContact(email, phone);
    if (duplicateMessage) return res.status(409).json({ message: duplicateMessage });

    const passwordHash = await bcrypt.hash(password, 10);
    await saveChallenge({
      email,
      purpose: 'signup',
      pendingSignup: {
        name: normalizedName,
        phone,
        dateOfBirth: birthDate,
        role: normalizedRole,
        password: passwordHash,
      },
    });
    res.json({ message: 'Verification code sent to your email address.', expiresIn: 60 });
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ message: error.message });
    if (error.status === 503) return res.status(503).json({ message: 'Email delivery is unavailable. Contact the system administrator.' });
    console.error('Could not start account registration:', error);
    res.status(500).json({ message: 'Could not start registration. Please try again.' });
  }
});

router.post('/register/verify-otp', otpRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    if (!email || !/^\d{4}$/.test(code)) return res.status(400).json({ message: 'Invalid verification code.' });

    const challenge = await EmailChallenge.findOne({ email, purpose: 'signup' });
    const verified = await consumeOtp(challenge, code);
    if (!verified || !challenge.pendingSignup) return res.status(400).json({ message: 'Invalid or expired verification code.' });

    const duplicateMessage = await isDuplicateContact(email, challenge.pendingSignup.phone);
    if (duplicateMessage) {
      await EmailChallenge.deleteOne({ _id: challenge._id });
      return res.status(409).json({ message: duplicateMessage });
    }

    const baseId = accountIdBase(challenge.pendingSignup.name, challenge.pendingSignup.role, challenge.pendingSignup.dateOfBirth);
    let user;
    for (let suffix = 0; suffix < 100; suffix += 1) {
      const userId = suffix === 0 ? baseId : `${baseId}${suffix + 1}`;
      try {
        user = await User.create({
          name: challenge.pendingSignup.name,
          email,
          userId,
          phone: challenge.pendingSignup.phone,
          dateOfBirth: challenge.pendingSignup.dateOfBirth,
          password: challenge.pendingSignup.password,
          role: challenge.pendingSignup.role,
        });
        break;
      } catch (error) {
        if (error.code === 11000 && error.keyPattern?.userId) continue;
        if (error.code === 11000) {
          await EmailChallenge.deleteOne({ _id: challenge._id });
          return res.status(409).json({ message: 'This email or phone number is already registered. Please log in.' });
        }
        throw error;
      }
    }

    if (!user) return res.status(409).json({ message: 'Could not create a unique account ID. Please try again.' });
    await EmailChallenge.deleteOne({ _id: challenge._id });
    res.status(201).json({
      message: 'Registration successful.',
      user: { id: user._id, name: user.name, email: user.email, userId: user.userId, role: user.role },
    });
  } catch (error) {
    console.error('Could not complete account registration:', error);
    res.status(500).json({ message: 'Could not complete registration. Please try again.' });
  }
});

router.post('/password-reset/request-otp', otpRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const userId = normalizeUserId(req.body.userId);
    if (!email || !userId) return res.status(400).json({ message: 'Enter your account ID and email address.' });

    const user = await User.findOne({ userId, email }).select('_id userId email').lean();
    if (user) await saveChallenge({ email, purpose: 'password-reset', userId: user.userId });
    res.json({ message: 'If the account exists, a verification code will be sent to its email address.', expiresIn: 60 });
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ message: error.message });
    if (error.status === 503) return res.status(503).json({ message: 'Email delivery is unavailable. Contact the system administrator.' });
    console.error('Could not start password reset:', error);
    res.status(500).json({ message: 'Could not send a password reset code. Please try again.' });
  }
});

router.post('/password-reset/reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const userId = normalizeUserId(req.body.userId);
    const code = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    const password = req.body.password;
    if (!email || !userId || !/^\d{4}$/.test(code) || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Enter a valid code and a password with at least 8 characters.' });
    }

    const challenge = await EmailChallenge.findOne({ email, userId, purpose: 'password-reset' });
    const verified = await consumeOtp(challenge, code);
    if (!verified) return res.status(400).json({ message: 'Invalid or expired verification code.' });

    const user = await User.findOne({ email, userId });
    if (!user) return res.status(400).json({ message: 'Invalid account ID or email address.' });
    user.password = await bcrypt.hash(password, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await EmailChallenge.deleteOne({ _id: challenge._id });
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    console.error('Could not reset password:', error);
    res.status(500).json({ message: 'Could not reset your password. Please try again.' });
  }
});

router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const identifier = typeof req.body.email === 'string' ? req.body.email : req.body.userId;
    const email = normalizeEmail(identifier);
    const userId = normalizeUserId(identifier);
    const password = req.body.password;
    const requestedRole = typeof req.body.role === 'string' ? req.body.role.trim().toLowerCase() : '';
    if ((!email && !userId) || typeof password !== 'string'
      || (req.body.role !== undefined && !['admin', 'hr', 'employee'].includes(requestedRole))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = await User.findOne(email.includes('@') ? { email } : { userId });
    if (!user || (requestedRole && user.role !== requestedRole) || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const role = String(user.role).trim().toLowerCase();
    const token = jwt.sign(
      { id: user._id, role, email: user.email, tokenVersion: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, userId: user.userId, role },
    });
  } catch (error) {
    console.error('Could not sign in:', error);
    res.status(500).json({ message: 'Could not sign in. Please try again.' });
  }
});

module.exports = router;
