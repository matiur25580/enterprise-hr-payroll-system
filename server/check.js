require('dotenv').config();
const mongoose=require('mongoose');
(async()=>{
await mongoose.connect(process.env.MONGO_URI);
const User=require('./models/User');
const u=await User.findOne({email:'admin@hr.com'});
console.log('found:', !!u);
if(u) console.log(u.email, u.role);
process.exit();
})();
