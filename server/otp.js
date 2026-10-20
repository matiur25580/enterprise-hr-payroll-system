const nodemailer = require('nodemailer');
const otps = new Map();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER?.trim(), pass: process.env.EMAIL_PASS?.replace(/\s+/g,'') }
});
async function sendOtp(email){
  const otp = Math.floor(100000 + Math.random()*900000).toString();
  otps.set(email, { otp, exp: Date.now()+5*60*1000 });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Northstar Workplace - Your OTP',
    text: `Your 6-digit OTP is ${otp}. Valid for 5 minutes.`
  });
  return true;
}
function verifyOtp(email, code){
  const r = otps.get(email);
  if(!r) return 'invalid';
  if(Date.now() > r.exp){ otps.delete(email); return 'expired'; }
  if(r.otp !== code) return 'invalid';
  otps.delete(email); return 'ok';
}
module.exports = { sendOtp, verifyOtp };
