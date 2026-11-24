const jwt = require('jsonwebtoken');
// Authentication verifies the Bearer JWT; authorization then checks the role attached to that token.
const verifyToken = (req,res,next)=>{
  const header = req.headers.authorization;
  if(!header || !header.startsWith('Bearer '))
    return res.status(401).json({message:'No token provided'});
  const token = header.split(' ')[1];
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  }catch(e){ return res.status(401).json({message:'Invalid token'}); }
};
const authorize = (...roles)=>{
  return (req,res,next)=>{
    if(!roles.includes(req.user.role))
      return res.status(403).json({message:'Access denied'});
    next();
  };
};
module.exports = {verifyToken, authorize};
