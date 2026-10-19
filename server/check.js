require('dotenv').config();
const mongoose=require('mongoose');
(async()=>{
try {
  if (!process.env.MONGO_URI || !process.env.CHECK_USER_EMAIL) throw new Error('MONGO_URI and CHECK_USER_EMAIL are required');
  await mongoose.connect(process.env.MONGO_URI);
  const User=require('./models/User');
  const user=await User.findOne({email:process.env.CHECK_USER_EMAIL.trim().toLowerCase()}).select('email role').lean();
  console.log('User found:', Boolean(user));
  if (user) console.log('Role:', user.role);
} catch (error) {
  console.error('User check failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
})();
