const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass) {
    const error = new Error('Email delivery is not configured');
    error.status = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.EMAIL_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });
}

async function sendOtpEmail(email, code) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Password reset code',
    text: `Your verification code to reset your password is ${code}. It expires in 60 seconds. If you did not request this, you can ignore this email.`,
  });
}

async function sendWelcomeEmail(email, name) {
  const transporter = createTransporter();
  let loginUrl = 'your organization’s sign-in page';
  try {
    const configuredUrl = new URL(process.env.CLIENT_URL);
    if (configuredUrl.protocol === 'https:' || configuredUrl.protocol === 'http:') loginUrl = configuredUrl.href;
  } catch {
    if (process.env.CLIENT_URL) console.warn('CLIENT_URL is not a valid sign-in URL; omitting it from the welcome email.');
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Your workplace account is ready',
    text: `Hello ${name},\n\nYour workplace account has been created. You can sign in at ${loginUrl} using your work email address. Your administrator will provide your password through an approved secure channel.\n\nIf you were not expecting this account, contact your organization’s administrator.`,
  });
}

module.exports = sendOtpEmail;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
