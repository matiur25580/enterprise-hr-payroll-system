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

async function sendOtpEmail(email, code, purpose) {
  const transporter = createTransporter();
  const subject = purpose === 'signup' ? 'Verify your email address' : 'Password reset code';
  const action = purpose === 'signup' ? 'complete your account registration' : 'reset your password';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject,
    text: `Your verification code to ${action} is ${code}. It expires in 60 seconds. If you did not request this, you can ignore this email.`,
  });
}

module.exports = sendOtpEmail;
