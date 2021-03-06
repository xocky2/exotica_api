const express = require('express');
const router = express.Router();
const mysql = require('../mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// CADASTRA USUÁRIO E ENDEREÇO  
router.post('/', async(req,res,next)=>{
    try {
        if (req.body.email && req.body.pwd){
            const selectEmail =  await mysql.execute(`SELECT email from user where email = ?`,[[req.body.email]])
            if (selectEmail.length >0){
                return res.status(206).send({messag: `E-mail ${req.body.email} already registered`});
            } 
            const insertUser = await mysql.execute(`INSERT INTO user (EMAIL,PASSWORD,NAME,GENDER,TELEPHONE,CPF,STATUS) VALUES (?,?,?,?,?,?,?);`,
            [req.body.email,req.body.pwd,req.body.name,req.body.gender,req.body.telephone,req.body.cpf,req.body.status])
            if (insertUser.insertId >0){
                if(req.body.address){
                    const insertAddress = await mysql.execute(`INSERT INTO address (NAME,ADDRESS,DISTRICT,CITY,STATE,COUNTRY,CEP,STATUS,USER_IDUSER) VALUES (?,?,?,?,?,?,?,?,?)`,
                                [req.body.address.name,
                                req.body.address.address,
                                req.body.address.district,
                                req.body.address.city,
                                req.body.address.state,
                                req.body.address.country,
                                req.body.address.cep,
                                req.body.address.status,
                                insertUser.insertId]);
                    if(insertAddress.insertId){
                      return res.status(201).send({message: 'User created',id: insertUser.insertId, idaddress: insertAddress.insertId});  
                    }
                }else{
                    return res.status(201).send({message: 'User created',id: insertUser.insertId});
                }

                return res.status(201).send({message: 'User created',id: insertUser.insertId});
            }else{ 
                return res.status(206).send('Not created');
            };
        }else{
            return res.status(206).send('E-mail or password not sended');
        }
    } catch (error) {
        console.log(error)
        return res.status(500).send({message: 'Erro: ' + error});
    }
});

// LOGIN DO USUÁRIO
router.post('/login', async(req,res,next)=>{
    try {
        if(req.body.email && req.body.pwd){
            const validateUser = await mysql.execute (`select * from user where email = ? and password = ?`,[req.body.email,req.body.pwd]);
            console.log(validateUser.length);
            if(validateUser.length > 0){
                const token = jwt.sign({
                 id: validateUser[0].iduser,
                 email:  validateUser[0].email,
                 pwd: validateUser[0].password
                },
                 process.env.SECRET,
                {
                expiresIn: "48h" // expires in 48min
                }
            );


            const selectAddress = await mysql.execute(`select * from address where user_iduser = ?`,[validateUser[0].iduser]);
            if(selectAddress.length > 0){
                let address = [];
                for (let index = 0; index < selectAddress.length; index++) {
                    address.push({
                        idaddress: selectAddress[index].idaddress,
                        name: selectAddress[index].name,
                        address: selectAddress[index].address,
                        district: selectAddress[index].district,
                        city: selectAddress[index].city,
                        state: selectAddress[index].state,
                        country: selectAddress[index].country,
                        cep: selectAddress[index].cep,
                        status: selectAddress[index].status
                    });
                    console.log(address);
                }
                const response = {
                    auth: true,
                    token: token,
                    user: validateUser.map(validateUser => {
                        return{
                            iduser: validateUser.iduser,
                            email: validateUser.email,
                            name: validateUser.name,
                            gender: validateUser.gender,
                            telephone: validateUser.telephone,
                            cpf: validateUser.cpf,
                            status: validateUser.status,
                            address: address
                        }
                })}
                return res.status(200).send(response);
            }
            
            }else{
                res.status(500).json({message: 'Login inválido!'});
            }
            //auth ok 
          }else{
            res.status(500).json({message: 'Login inválido!'});
          }
          
    } catch (error) {
        res.status(500).send({message: 'Error : '+error});
    }    
});

// LOGOUT DO USUÁRIO
router.post('/logout', function(req, res) {
    res.json({ auth: false, token: null });
})

module.exports = router;
