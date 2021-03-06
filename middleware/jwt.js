const jwt = require('jsonwebtoken');
const mysql = require('../mysql');

exports.adm = async (req,res,next)=>{
  try {
    const token = req.headers['x-access-token'];
    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
    const decode = jwt.verify(token,process.env.SECRET);
    req.user = decode;
    const resultAdm = await mysql.execute(`SELECT status FROM user WHERE IDUSER = ?`,[req.user.id]);
    
    if(resultAdm.length >0){
      console.log(resultAdm[0].status);
      if(resultAdm[0].status == 'ADM'){
        
        next();
      }else{
        return res.status(401).send({message: 'Non authorized'});
      }
    }else{
      return res.status(401).send({message: 'Non authorized'});
    }

    
  } catch (error) {
    return res.status(401).send({message: 'Non authorized'});
  }
 
};

exports.login = (req,res,next)=>{
  try {
    const token = req.headers['x-access-token'];
    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
    const decode = jwt.verify(token,process.env.SECRET);
    req.user = decode;
    

    next();
  } catch (error) {
    return res.status(401).send({message: 'Non authorized'});
  }
 
};