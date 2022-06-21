const express = require('express');
const router = express.Router();
const mysql = require('../mysql');


// RETORNA TODOS PEDIDOS POR EMAIL DO USER
router.get('/', async(req,res,next)=>{
    if (req.body.email){
        const user = req.body.email;
    }
    


    
});


// CADASTRO DE PEDIDO
router.post('/',async(req,res,next)=>{
    const  productid = req.body.productid;
    return  res.status(200).send({
        ID: productid,
        message: 'Pedido cadastrado com sucesso !'
        
    });
});




module.exports = router;