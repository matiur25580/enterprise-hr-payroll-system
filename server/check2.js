require('dotenv').config();
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
(async()=>{
try {
  if (!process.env.MONGO_URI || !process.env.CHECK_USER_EMAIL || !process.env.CHECK_PASSWORD) {
    throw new Error('MONGO_URI, CHECK_USER_EMAIL, and CHECK_PASSWORD are required');
  }
  await mongoose.connect(process.env.MONGO_URI);
  const User=require('./models/User');
  const user=await User.findOne({email:process.env.CHECK_USER_EMAIL.trim().toLowerCase()}).select('password').lean();
  const matches = Boolean(user && await bcrypt.compare(process.env.CHECK_PASSWORD, user.password));
  console.log('Password matches:', matches);
  if (!matches) process.exitCode = 1;
} catch (error) {
  console.error('Credential check failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
})();
