const express = require('express');
const router = express.Router();
const mysql = require('../mysql');
const login = require('../middleware/jwt');


//formata a data
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    return [
        padTo2Digits(date.getDate()),
        padTo2Digits(date.getMonth() + 1),
        date.getFullYear(),
    ].join('/');
}

// RETORNA TODOS PEDIDOS POR EMAIL DO USER
router.get('/:iduser', async(req,res,next)=>{
    try {
        if (req.params.iduser){
            let selectOrders =  await mysql.execute(`SELECT * FROM exotica_db.order WHERE USER_IDUSER = ?;`,
            [req.params.iduser]);
            if(selectOrders.length >0){
                
                for (let index = 0; index < selectOrders.length; index++) {
                        // insere o endereço
                        const selectOrderAddress = await mysql.execute(`select * from address where idaddress = ?`,
                        [selectOrders[index].address_idaddress]);
                        if (selectOrderAddress.length > 0){
                            selectOrders[index].shipping_address = {
                                name: selectOrderAddress[0].name,
                                address: selectOrderAddress[0].address,
                                district: selectOrderAddress[0].district,
                                city: selectOrderAddress[0].city,
                                state: selectOrderAddress[0].state, 
                                country: selectOrderAddress[0].country,
                                cep: selectOrderAddress[0].cep,
                                status: selectOrderAddress[0].status
                            };
    
                        }else{
                            selectOrders[index].shipping_address = {};
                        }

                        // insere método de pagamento
                        const selectPaymentMethod = await mysql.execute(`select * from payment_method where idpayment_method = ?`,
                        [selectOrders[index].payment_method_idpayment_method]);
                        if(selectPaymentMethod.length >0){
                            selectOrders[index].payment = {
                                type: selectPaymentMethod[0].type,
                                cardNumber: selectPaymentMethod[0].cardName,
                                expirationMonth: selectPaymentMethod[0].expirationMonth,
                                expirationYear: selectPaymentMethod[0].expirationYear,
                                portion: selectPaymentMethod[0].portion,
                                pix_key: selectPaymentMethod[0].pix_key,
                                boleto_number: selectPaymentMethod[0].boleto_number
                            };
                        }else{
                            selectOrders[index].payment = {};
                        }
                        // insere itens do pedido
                        const selectOrderItens = await mysql.execute(`select idproduct,name,category,subcategory,description,price,order_idorder,quantity,size from product inner join product_has_order 
                        on product.idproduct = product_has_order.product_idproduct where order_idorder = ?;`,[selectOrders[index].idorder])
                        
                        if(selectOrderItens.length>0){
                            let itens = [];
                            let orderItem = {};
                            for (let index2 = 0; index2 < selectOrderItens.length; index2++) {
                                const item = selectOrderItens[index2];
                                const selectImage = await mysql.execute(`SELECT url from image where product_idproduct = ?`,[item.idproduct]);
                                let image;
                                if(selectImage.length >0 ){
                                    image = selectImage[0].url;
                            
                                }

                                
                                orderItem = {
                                    idproduct: item.idproduct,
                                    image: image,
                                    name: item.name,
                                    category: item.category,
                                    subcategory: item.subcategory,
                                    description: item.description,
                                    price: item.price,
                                    itemPrice: item.price * item.quantity,
                                    quantity: item.quantity,
                                    size: item.size
                                };
                                itens.push(orderItem);                                
                            }
                            selectOrders[index].products = itens;


                        }else{
                            selectOrders[index].products = [];
                        }

                        



                }// fim do primeiro for
               
                const orders = {
                    orders: selectOrders.map(order  =>{
                    return {
                        idorder: order.idorder,
                        status: order.status,
                        date: formatDate(order.date),
                        shipping_price: order.shipping_price,
                        total_price: order.total_price,
                        shipping_address: order.shipping_address,
                        payment: order.payment,
                        products: order.products
                    }
                })
            }

                
        
                return res.status(200).send(orders);
            }else{
                return res.status(404).send({message: 'No orders found '});
            }            
        }else{
            return res.status(404).send({message: 'No iduser found '});
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send({error:' Erro : ' + error});
    }
    
    
    
});

// CADASTRO DE PEDIDO 
router.post('/',login.login,async(req,res,next)=>{
    try {
        if(req.body.iduser){
            let testStock = req.body.products;
            let invalidStock = [];
            for (let index = 0; index < testStock.length; index++) {
                const validateStock = await mysql.execute(`SELECT quantity FROM stock WHERE PRODUCT_IDPRODUCT = ? AND SIZE = ?`,
                [testStock[index]['idproduct'],testStock[index]['size']]);
                if(validateStock.length){
                    if (validateStock[0].quantity < testStock[index]['quantity']){
                        invalidStock.push({idproduct: testStock[index]['idproduct'],size: testStock[index]['size'],quantity:testStock[index]['quantity'],availableQuantity: validateStock[0].quantity});
                    }
                }else{
                    return  res.status(500).send({message: 'Erro ao consultar estoque para um produto, produto não cadastrado ou estoque inexistente'});
                }
                
            }
            // retorna os itens que não tem estoque
            if(invalidStock.length){
                const response = {
                    message: 'Estoque inválido para os produtos',
                    products: invalidStock.map(invalidStock => {
                        return {
                            idproduct: invalidStock.idproduct,
                            size: invalidStock.size,
                            orderQuantity: invalidStock.quantity,
                            availableQuantity: invalidStock.availableQuantity 

                        }
                    })
                }
                return  res.status(500).send({response});
            }else{
                try {
                    const insertPaymentMethod = await mysql.execute(`INSERT INTO payment_method (TYPE, CARDNUMBER, CARDNAME, EXPIRATIONMONTH, EXPIRATIONYEAR, PORTION,PIX_KEY, boleto_number)  VALUES ( ? , ? , ? , ? , ? , ?, ?, ? ) ;`,
                    [req.body.pay.type,
                        req.body.pay.cardNumber,
                        req.body.pay.cardName,
                        req.body.pay.expirationMonth,
                        req.body.pay.expirationYear,
                        req.body.pay.portion,
                        req.body.pay.pix_key,
                        req.body.pay.boleto_number]);

                        if(insertPaymentMethod.insertId>0){
                            let insertOrder1,insertOrder2;
                            if(req.body.user_address_id != null){
                                insertOrder1 = await mysql.execute(`INSERT INTO exotica_db.order (STATUS,DATE,TOTAL_PRICE,SHIPPING_PRICE,USER_IDUSER,ADDRESS_IDADDRESS,PAYMENT_METHOD_IDPAYMENT_METHOD) VALUES ( ?,?,?,?,?,?,?); `,
                                [req.body.status,
                                req.body.date,
                                req.body.total_price,
                                req.body.shipping_price,
                                req.body.iduser,
                                req.body.user_address_id,
                                insertPaymentMethod.insertId]);
                            }else{
                                const insertAddress = await mysql.execute(`INSERT INTO address (NAME,ADDRESS,DISTRICT,CITY,STATE,COUNTRY,CEP,STATUS,USER_IDUSER) VALUES (?,?,?,?,?,?,?,?,?)`,
                                [req.body.shipping_address.name,
                                req.body.shipping_address.address,
                                req.body.shipping_address.district,
                                req.body.shipping_address.city,
                                req.body.shipping_address.state,
                                req.body.shipping_address.country,
                                req.body.shipping_address.cep,
                                req.body.shipping_address.status,
                                req.body.iduser]);

                                if(insertAddress.insertId>0){
                                     insertOrder2 = await mysql.execute(`INSERT INTO exotica_db.order (STATUS,DATE,TOTAL_PRICE,SHIPPING_PRICE,USER_IDUSER,ADDRESS_IDADDRESS,PAYMENT_METHOD_IDPAYMENT_METHOD) VALUES ( ?,?,?,?,?,?,?); `,
                                    [req.body.status,
                                    req.body.date,
                                    req.body.total_price,
                                    req.body.shipping_price,
                                    req.body.iduser,
                                    insertAddress.insertId,
                                    insertPaymentMethod.insertId]);

                                }else{return  res.status(500).send({message: 'Address not inserted !' });}
                            }
                            let idorder = insertOrder1 ? insertOrder1.insertId: insertOrder2.insertId;
                            if(idorder){
                                // adiciona itens ao pedido e remove estoque
                               let itens =  req.body.products;

                               for (let index = 0; index < itens.length; index++) {
                                const insertItem = await mysql.execute(`INSERT INTO product_has_order (PRODUCT_IDPRODUCT,ORDER_IDORDER,QUANTITY,SIZE) values (?,?,?,?)`,
                                [itens[index].idproduct,
                                idorder,
                                itens[index].quantity,
                                itens[index].size]);
                                if (insertItem.affectedRows > 0){
                                    const selectQuantity = await mysql.execute(`SELECT quantity FROM stock WHERE PRODUCT_IDPRODUCT = ? AND SIZE = ?`,
                                    [itens[index]['idproduct'],itens[index]['size']]);
                                    let curbal = selectQuantity[0].quantity - itens[index].quantity;
                                
                                    
                                    const updateStock = await mysql.execute(`UPDATE stock SET QUANTITY = ? WHERE PRODUCT_IDPRODUCT = ? AND SIZE = ?`,
                                     [curbal,
                                     itens[index]['idproduct'],
                                     itens[index]['size']]);
                                    
                                }else{return  res.status(500).send({message: `Item not inserted\nItem: ${itens[index]['idproduct']}\nTamanho: ${itens[index]['size']}`  }); }
                               }
                               return  res.status(200).send({message: 'Order registred, orderid: '+idorder});



                            }
                            
                        }else{return  res.status(500).send({message: 'Payment method not inserted !' }); }

                        return  res.status(200).send('teste   '+ insertPaymentMethod.insertId);
                } catch (error) {
                    console.log(error)
                    return  res.status(500).send({
                        message: 'Order not registred !'+error  
                    });
                }
      
            }
        
        }
    } catch (error) {
        return  res.status(500).send({
            message: 'Order not registred !'+error
            
        });
    }
    
});

module.exports = router;