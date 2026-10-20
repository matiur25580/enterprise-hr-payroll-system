const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SetupLock = require('../models/SetupLock');
const EmailChallenge = require('../models/EmailChallenge');
const sendOtpEmail = require('../utils/email');
const createRateLimit = require('../middlewares/rateLimit');
const { verifyToken } = require('../middlewares/auth');

const router = express.Router();
const OTP_LIFETIME_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const loginRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many sign-in attempts. Try again later.' });
const registrationRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many account setup attempts. Try again later.' });
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

async function saveChallenge({ email, purpose, userId }) {
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
  if (userId) update.userId = userId;

  const challenge = await EmailChallenge.findOneAndUpdate(
    { email, purpose },
    { $set: update },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  try {
    await sendOtpEmail(email, code);
  } catch (error) {
    console.error('Could not send verification email:', error);
    await EmailChallenge.deleteOne({ _id: challenge._id, codeHash });
    const deliveryError = new Error('Email delivery failed');
    deliveryError.status = 503;
    throw deliveryError;
  }
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

router.get('/setup-status', async (req, res) => {
  try {
    return res.json({ initialAdminRequired: !(await User.exists({})) });
  } catch (error) {
    console.error('Could not check initial account setup:', error);
    return res.status(500).json({ message: 'Could not check account setup status.' });
  }
});

router.post('/signup', registrationRateLimit, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  if (!name || name.length > 120 || !email || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Enter a valid name and email address, and a password with at least 8 characters.' });
  }

  const claimId = crypto.randomUUID();
  let claimed = false;
  try {
    if (await User.exists({})) {
      return res.status(403).json({ message: 'Initial administrator setup is already complete.' });
    }

    try {
      await SetupLock.create({
        _id: 'initial-admin-setup',
        status: 'in-progress',
        claimId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      claimed = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      const lock = await SetupLock.findOneAndUpdate(
        { _id: 'initial-admin-setup', status: 'in-progress', expiresAt: { $lte: new Date() } },
        { $set: { claimId, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } },
        { new: true },
      );
      if (!lock) return res.status(403).json({ message: 'Initial administrator setup is already complete or in progress.' });
      claimed = true;
    }

    if (await User.exists({})) {
      await SetupLock.deleteOne({ _id: 'initial-admin-setup', claimId });
      return res.status(403).json({ message: 'Initial administrator setup is already complete.' });
    }

    const user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: 'admin',
      status: 'active',
    });
    user.userId = `AD${user._id.toString().toUpperCase()}`;
    await user.save();
    try {
      await SetupLock.deleteOne({ _id: 'initial-admin-setup', claimId });
    } catch (cleanupError) {
      console.error('Could not clear initial-admin setup lock:', cleanupError);
    }

    return res.status(201).json({
      message: 'Administrator account created. You can now sign in.',
      user: { userId: user.userId, role: user.role, status: user.status },
    });
  } catch (error) {
    if (claimed) {
      try {
        await SetupLock.deleteOne({ _id: 'initial-admin-setup', claimId, status: 'in-progress' });
      } catch (cleanupError) {
        console.error('Could not release initial-admin setup lock:', cleanupError);
      }
    }
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Account data is invalid.' });
    console.error('Could not create initial administrator:', error);
    return res.status(500).json({ message: 'Could not create the administrator account.' });
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
    if (!email || !userId || !/^\d{4}$/.test(code) || typeof password !== 'string'
      || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
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
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account pending admin approval' });
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
