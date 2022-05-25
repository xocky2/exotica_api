const express = require('express');
const app = express();
const routeProducts = require('./routes/products');
const cors = require('cors');

app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: false })) //apenas dados simples
app.use(express.json())//apenas json de entrada no body

app.use('/products', routeProducts);
app.use(cors());

app.use((req,res,next)=>{
    const erro = new Error('Ops, rota não encontrada');
    erro.status = 404;
    next(erro);
});


app.use((error, req,res,next)=>{
    res.status(error.status || 500);
    return res.send({
        erro: {
            mensagem: error.message
        }
    });
});

module.exports = app;