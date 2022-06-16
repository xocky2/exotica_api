const express = require('express');
const router = express.Router();
const mysql = require('../mysql');
const bcrypt = require('bcrypt');

// RETORNA TODOS USUÁRIOS OU SOMENTE UM USUÁRIO
router.get('/', async(req,res,next)=>{
    res.send({message:'all users'});
});
// CADASTRA USUÁRIO E ENDEREÇO
router.post('/', async(req,res,next)=>{
    res.send({message:'User created'});
});

// LOGIN DO USUÁRIO
router.post('/login', async(req,res,next)=>{

    if(req.body.user === users[1].user && req.body.pwd === users[1].pwd){
        //auth ok
        const id = 1; //esse id viria do banco de dados
        const token = jwt.sign({
             id: users[0].id 
            },
             process.env.SECRET,
            {
            expiresIn: "24h" // expires in 5min
            }
        );
        return res.json({
             auth: true, 
             token: token 
            });
      }
      
      res.status(500).json({message: 'Login inválido!'});
});

// LOGOUT DO USUÁRIO
router.post('/logout', function(req, res) {
    res.json({ auth: false, token: null });
})


module.exports = router;
