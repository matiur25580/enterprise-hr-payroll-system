const nodemailer = require('nodemailer');

function getEmailCredentials() {
  const user = typeof process.env.EMAIL_USER === 'string' ? process.env.EMAIL_USER.trim().toLowerCase() : '';
  const pass = typeof process.env.EMAIL_PASS === 'string' ? process.env.EMAIL_PASS.replace(/\s/g, '') : '';

  return { user, pass };
}

function isEmailConfigured() {
  const { user, pass } = getEmailCredentials();
  return Boolean(user && pass);
}

function createTransporter() {
  const { user, pass } = getEmailCredentials();

  if (!user || !pass) {
    const error = new Error('Email delivery is unavailable. Check the EMAIL_USER and EMAIL_PASS configuration.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendOtpEmail(email, code, purpose = 'password-reset') {
  const transporter = createTransporter();
  const { user } = getEmailCredentials();
  const isSignup = purpose === 'signup';
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM?.trim() || user,
      to: email,
      subject: isSignup ? 'Your Northstar registration code' : 'Password reset code',
      text: `Your verification code ${isSignup ? 'to complete your Northstar registration' : 'to reset your password'} is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    });
  } catch (error) {
    console.error('Could not send verification email:', error);
    if (error instanceof Error) error.code = 'EMAIL_SEND_FAILED';
    throw error;
  }
}

async function sendWelcomeEmail(email, name) {
  const transporter = createTransporter();
  const { user } = getEmailCredentials();
  let loginUrl = 'your organization’s sign-in page';
  try {
    const configuredUrl = new URL(process.env.CLIENT_URL);
    if (configuredUrl.protocol === 'https:' || configuredUrl.protocol === 'http:') loginUrl = configuredUrl.href;
  } catch {
    if (process.env.CLIENT_URL) console.warn('CLIENT_URL is not a valid sign-in URL; omitting it from the welcome email.');
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM?.trim() || user,
    to: email,
    subject: 'Your workplace account is ready',
    text: `Hello ${name},\n\nYour workplace account has been created. You can sign in at ${loginUrl} using your work email address. Your administrator will provide your password through an approved secure channel.\n\nIf you were not expecting this account, contact your organization’s administrator.`,
  });
}

module.exports = sendOtpEmail;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
module.exports.isEmailConfigured = isEmailConfigured;
