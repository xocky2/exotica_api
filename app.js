const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');

const routeProducts = require('./routes/product');
const routeUsers = require('./routes/user');
const routeOrders = require('./routes/order');

app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: false })) //apenas dados simples
app.use(express.json())//apenas json de entrada no body
app.use(cors());



app.use('/user', routeUsers);
app.use('/product', routeProducts);
app.use('/order', routeOrders);

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