require('dotenv').config();
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
(async()=>{
await mongoose.connect(process.env.MONGO_URI);
const User=require('./models/User');
const u=await User.findOne({email:'admin@hr.com'});
const ok=await bcrypt.compare('Admin@123', u.password);
console.log('password match:', ok);
process.exit();
})();
