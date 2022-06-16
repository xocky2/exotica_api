const express = require('express');
const router = express.Router();
const mysql = require('../mysql');


// RETORNA TODOS PEDIDOS
router.get('/', async(req,res,next)=>{
    const response = {
        pedidos :{
            id: productid,
            product: 'Calcinha sexy', 
            quantity: 2,
            size: 'PP'

        }
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