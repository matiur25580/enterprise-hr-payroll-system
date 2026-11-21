const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const EmailChallenge = require('../models/EmailChallenge');
const sendOtpEmail = require('../utils/email');
const createRateLimit = require('../middlewares/rateLimit');
const { verifyToken } = require('../middlewares/auth');
const { isPublicSignupRole } = require('../config/signupPolicy');

const router = express.Router();
const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const rolePrefixes = { admin: 'AD', hr: 'HR', employee: 'EM' };
const loginRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many sign-in attempts. Try again later.' });
const registrationRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many signup attempts. Try again later.' });
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

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

function makeOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function parseBirthDate(value) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return null;
  const day = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const year = Number(value.slice(4, 8));
  if (year < 1900) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day || date.getTime() > Date.now()) return null;
  return date;
}

function normalizePhone(phone) {
  if (typeof phone !== 'string' || !/^[+\d\s().-]+$/.test(phone)) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? `+${digits}` : '';
}

function makeUniqueId(name, role, birthDate) {
  const names = name.trim().split(/\s+/);
  const first = names[0]?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]/i)?.[0];
  const surname = names[names.length - 1]?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]/i)?.[0];
  if (names.length < 2 || !first || !surname || !rolePrefixes[role]) return null;

  const day = String(birthDate.getUTCDate()).padStart(2, '0');
  const month = String(birthDate.getUTCMonth() + 1).padStart(2, '0');
  const year = birthDate.getUTCFullYear();
  return `${rolePrefixes[role]}${first}${surname}`.toUpperCase() + `${day}${month}${year}`;
}

async function saveChallenge({ email, purpose, pendingSignup, userId }) {
  const currentChallenge = await EmailChallenge.findOne({ email, purpose }).select('resendAfter codeHash').lean();
  if (currentChallenge?.resendAfter && currentChallenge.resendAfter.getTime() > Date.now()) {
    const error = new Error('Please wait before requesting another code.');
    error.status = 429;
    throw error;
  }

  let code = makeOtp();
  while (currentChallenge?.codeHash && await bcrypt.compare(code, currentChallenge.codeHash)) {
    code = makeOtp();
  }
  const codeHash = await bcrypt.hash(code, 10);
  const now = Date.now();
  const update = {
    codeHash,
    expiresAt: new Date(now + OTP_LIFETIME_MS),
    resendAfter: new Date(now + OTP_RESEND_DELAY_MS),
    attempts: 0,
  };
  const unset = { verifiedAt: 1 };
  if (pendingSignup) {
    update.pendingSignup = pendingSignup;
    unset.userId = 1;
  }
  if (userId) {
    update.userId = userId;
    unset.pendingSignup = 1;
  }

  const challenge = await EmailChallenge.findOneAndUpdate(
    { email, purpose },
    { $set: update, $unset: unset },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  try {
    await sendOtpEmail(email, code);
  } catch (error) {
    await EmailChallenge.deleteOne({ _id: challenge._id, codeHash });
    throw error;
  }
}

async function findDuplicateRegistration(email, phone) {
  return User.exists({ $or: [{ email }, { phone }] });
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

router.post(['/send-otp', '/signup/request-otp'], registrationRateLimit, async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const birthDate = parseBirthDate(req.body.dateOfBirth);
    const role = normalizeRole(req.body.role);
    const password = req.body.password;
    if (!isPublicSignupRole(role)) {
      return res.status(403).json({ message: 'Public registration is limited to employee accounts. Admin and HR accounts must be provisioned by an authorized administrator.' });
    }
    const confirmPassword = req.body.confirmPassword;

    if (!name || name.length > 120 || name.split(/\s+/).length < 2
      || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !phone || !birthDate || !rolePrefixes[role] || !makeUniqueId(name, role, birthDate)
      || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72
      || password !== confirmPassword) {
      return res.status(400).json({ message: 'Complete every field with valid information. Enter your full name, use a valid date, and ensure passwords match and contain at least 8 characters.' });
    }

    if (await findDuplicateRegistration(email, phone)) {
      // Keep the response indistinguishable from a successful request to avoid account enumeration.
      return res.json({
        success: true,
        message: 'If the details are eligible, a verification code will be sent.',
        expiresIn: OTP_LIFETIME_MS / 1000,
      });
    }

    const pendingSignup = {
      name,
      phone,
      dateOfBirth: birthDate,
      role,
      password: await bcrypt.hash(password, 12),
    };
    await saveChallenge({ email, purpose: 'signup', pendingSignup });
    return res.json({
      success: true,
      message: 'If the details are eligible, a verification code will be sent.',
      expiresIn: OTP_LIFETIME_MS / 1000,
    });
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ message: error.message });
    if (error.code === 'EMAIL_NOT_CONFIGURED' || error.code === 'EMAIL_SEND_FAILED') {
      return res.status(503).json({
        error: error.code,
        message: 'Email verification is unavailable. Please contact the administrator.',
      });
    }
    console.error('Could not start account registration:', error);
    res.status(500).json({ message: 'Could not start registration. Please try again.' });
  }
});

router.post(['/verify-otp', '/signup/verify-otp'], otpRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ message: 'invalid credentials/OTP' });

    const challenge = await EmailChallenge.findOne({ email, purpose: 'signup' });
    if (!challenge) return res.status(400).json({ error: 'invalid credentials/OTP', message: 'invalid credentials/OTP' });
    if (challenge.expiresAt.getTime() <= Date.now()) {
      await EmailChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ error: 'OTP expired', message: 'OTP expired' });
    }
    if (!challenge.pendingSignup) {
      return res.status(400).json({ message: 'invalid credentials/OTP' });
    }

    const { name, phone, dateOfBirth, role, password } = challenge.pendingSignup;
    if (await findDuplicateRegistration(email, phone)) {
      return res.status(400).json({ error: 'invalid credentials/OTP', message: 'invalid credentials/OTP' });
    }

    const uniqueId = makeUniqueId(name, role, new Date(dateOfBirth));
    if (!uniqueId) return res.status(400).json({ message: 'Registration information is invalid.' });
    const verified = await consumeOtp(challenge, code);
    if (!verified) return res.status(400).json({ error: 'invalid credentials/OTP', message: 'invalid credentials/OTP' });
    const consumedChallenge = await EmailChallenge.findOneAndDelete({
      _id: challenge._id,
      codeHash: challenge.codeHash,
      expiresAt: { $gt: new Date() },
      attempts: { $lte: MAX_OTP_ATTEMPTS },
    });
    if (!consumedChallenge) {
      return res.status(400).json({ error: 'invalid credentials/OTP', message: 'invalid credentials/OTP' });
    }
    const user = new User({
      name,
      email,
      uniqueId,
      userId: uniqueId,
      phone,
      dateOfBirth,
      password,
      role,
      status: 'active',
    });
    await user.save();
    try {
      await Employee.updateOne(
        { email },
        { $setOnInsert: { name, email, department: 'Unassigned', designation: 'Employee', salary: 0 } },
        { upsert: true, runValidators: true },
      );
    } catch (employeeError) {
      if (employeeError.code !== 11000 || !await Employee.exists({ email })) {
        await User.deleteOne({ _id: user._id });
        throw employeeError;
      }
    }
    res.status(201).json({
      message: 'registration successful',
      user: { id: user._id, name: user.name, email: user.email, uniqueId, userId: uniqueId, role: user.role },
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.uniqueId || error.keyPattern?.userId) {
        return res.status(409).json({ message: 'Could not create a unique ID in the requested format. Please contact support.' });
      }
      return res.status(409).json({ message: 'this email and number already registered, plz login' });
    }
    console.error('Could not complete account registration:', error);
    res.status(500).json({ message: 'Could not complete registration. Please try again.' });
  }
});

router.post('/password-reset/request-otp', otpRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const userId = normalizeUserId(req.body.uniqueId || req.body.userId);
    if (!email || !userId) return res.status(400).json({ message: 'Enter your unique ID and email address.' });

    const user = await User.findOne({ $or: [{ uniqueId: userId }, { userId }], email }).select('_id uniqueId userId email').lean();
    if (!user) return res.status(404).json({ message: "this unique id doesn't exist with this email" });
    await saveChallenge({ email, purpose: 'password-reset', userId: user.uniqueId || user.userId });
    res.json({ message: 'Verification code sent to your email address.', expiresIn: OTP_LIFETIME_MS / 1000 });
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ message: error.message });
    if (error.code === 'EMAIL_NOT_CONFIGURED' || error.code === 'EMAIL_SEND_FAILED') {
      return res.status(503).json({
        error: error.code,
        message: 'Email verification is unavailable. Please contact the administrator.',
      });
    }
    console.error('Could not start password reset:', error);
    res.status(500).json({ message: 'Could not send a password reset code. Please try again.' });
  }
});

router.post('/password-reset/verify-otp', otpRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const userId = normalizeUserId(req.body.uniqueId || req.body.userId);
    const code = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
    if (!email || !userId || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'invalid credentials/OTP' });
    }

    const challenge = await EmailChallenge.findOne({
      email,
      userId,
      purpose: 'password-reset',
    });
    if (challenge && challenge.expiresAt.getTime() < Date.now()) {
      await EmailChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'OTP expired' });
    }
    const verified = await consumeOtp(challenge, code);
    if (!verified) return res.status(400).json({ message: 'invalid credentials/OTP' });

    challenge.verifiedAt = new Date();
    await challenge.save();
    res.json({ message: 'Verification successful.' });
  } catch (error) {
    console.error('Could not verify password reset code:', error);
    res.status(500).json({ message: 'Could not verify the code. Please try again.' });
  }
});

router.post('/password-reset/reset', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const userId = normalizeUserId(req.body.uniqueId || req.body.userId);
    const password = req.body.password;
    if (!email || !userId || typeof password !== 'string' || password.length < 8
      || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Enter a password with at least 8 characters.' });
    }

    const challenge = await EmailChallenge.findOne({
      email,
      userId,
      purpose: 'password-reset',
      expiresAt: { $gt: new Date() },
      verifiedAt: { $exists: true },
    });
    if (!challenge) return res.status(400).json({ message: 'Verify your OTP before changing your password.' });

    const user = await User.findOne({ email, $or: [{ uniqueId: userId }, { userId }] });
    if (!user) return res.status(404).json({ message: "this unique id doesn't exist with this email" });
    user.password = await bcrypt.hash(password, 12);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await EmailChallenge.deleteOne({ _id: challenge._id });
    res.json({ message: 'password successfully change' });
  } catch (error) {
    console.error('Could not reset password:', error);
    res.status(500).json({ message: 'Could not reset your password. Please try again.' });
  }
});

router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const identifier = typeof req.body.identifier === 'string'
      ? req.body.identifier
      : typeof req.body.email === 'string'
        ? req.body.email
        : req.body.userId;
    const value = typeof identifier === 'string' ? identifier.trim() : '';
    const isEmail = value.includes('@');
    const email = isEmail ? normalizeEmail(value) : '';
    const userId = isEmail ? '' : normalizeUserId(value);
    const password = req.body.password;
    const requestedRole = normalizeRole(req.body.role);
    if ((!email && !userId) || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72
      || !rolePrefixes[requestedRole]) {
      return res.status(400).json({ message: 'Enter your account role, email or unique ID, and password.' });
    }

    const user = await User.findOne(isEmail
      ? { email }
      : { $or: [{ uniqueId: userId }, { userId }] });
    if (!user) {
      return res.status(404).json({
        message: isEmail
          ? "this email doesn't registered, plz first registered"
          : "this unique ID doesn't exist",
      });
    }
    if (normalizeRole(user.role) !== requestedRole) {
      return res.status(403).json({ message: 'Account role does not match the selected role.' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (user.status !== 'active') return res.status(403).json({ message: 'Account pending admin approval' });

    const role = normalizeRole(user.role);
    const token = jwt.sign(
      { id: user._id, role, email: user.email, tokenVersion: user.tokenVersion ?? 0 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );
    const uniqueId = user.uniqueId || user.userId;
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, uniqueId, userId: uniqueId, role },
    });
  } catch (error) {
    console.error('Could not sign in:', error);
    res.status(500).json({ message: 'Could not sign in. Please try again.' });
  }
});

module.exports = router;
