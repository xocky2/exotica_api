const express = require('express');
const router = express.Router();
const mysql = require('../mysql');
const login = require('../middleware/jwt');

// RETORNA TODOS PEDIDOS POR EMAIL DO USER
router.get('/',login.login, async(req,res,next)=>{
    try {
        if (req.body.iduser){
            const selectOrders =  await mysql.execute(`SELECT * FROM EXOTICA_DB.ORDER WHERE USER_IDUSER = ? ;`,
            [req.body.iduser]);
            if(selectOrders.length >0){
               // console.log(selectOrders);
                let pedido_produto = [];
                
                for (let index = 0; index < selectOrders.length; index++) {
                    pedido_produto = [...selectOrders];
                    console.log(pedido_produto[index]);
                    const addProducts = await mysql.execute(`SELECT * FROM PRODUCT_HAS_ORDER WHERE order_idorder = ? `,
                    [selectOrders[index].idorder]);
                    if(addProducts.length>0){
                    
                       // let products = await mysql.execute(`SELET * FROM PRODUCT WHERE IDPRODUCT = ?`,[addProducts.idproduct]);
                        //console.log("size do produto: "+products.size);
                                            }
                     
                }
                console.log(pedido_produto[0]);
                return res.status(200).send({message: 'Order: '+selectOrders.length});
            }else{
                return res.status(404).send({message: 'No orders found '});
            }


            // CONSTROI RESPONSE
            const response = {
                status: 201,
                product: orders.map(orders =>{
                    return {
                        idproduct: order.idproduct,
                        name: product.name,
                        description: product.description,
                        category: product.category, 
                        price: product.price,
                        status: product.status,
                        stock: stock ? stock :'no stock'     
                    }
                })

            }
            
        }
    } catch (error) {
        return res.status(500).send({error:' Erro : ' + error});
    }
    
    
    
});


// CADASTRO DE PEDIDO 
router.post('/',login.login,async(req,res,next)=>{
    console.log(req.user);
    try {
        if(req.body.iduser){
            let testStock = req.body.products;
            let invalidStock = [];
            for (let index = 0; index < testStock.length; index++) {
                const validateStock = await mysql.execute(`SELECT quantity FROM STOCK WHERE PRODUCT_IDPRODUCT = ? AND SIZE = ?`,
                [testStock[index]['idproduct'],testStock[index]['size']]);
                if(validateStock.length){
                    if (validateStock[0].quantity < testStock[index]['quantity']){
                        invalidStock.push({idproduct: testStock[index]['idproduct'],size: testStock[index]['size'],quantity:testStock[index]['quantity'],availableQuantity: validateStock[0].quantity});
                    }
                }else{
                    return  res.status(500).send({message: 'Erro ao consultar estoque para um produto, produto não cadastrado ou estoque inexistente'});
                }
                
            }
            console.log(invalidStock);
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
                    const insertPaymentMethod = await mysql.execute(`INSERT INTO PAYMENT_METHOD (TYPE, CARDNUMBER, CARDNAME, EXPIRATIONMONTH, EXPIRATIONYEAR, PORTION,PIX_KEY, boleto_number)  VALUES ( ? , ? , ? , ? , ? , ?, ?, ? ) ;`,
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
                                insertOrder1 = await mysql.execute(`INSERT INTO EXOTICA_DB.ORDER (STATUS,DATE,TOTAL_PRICE,SHIPPING_PRICE,USER_IDUSER,ADDRESS_IDADDRESS,PAYMENT_METHOD_IDPAYMENT_METHOD) VALUES ( ?,?,?,?,?,?,?); `,
                                [req.body.status,
                                req.body.date,
                                req.body.total_price,
                                req.body.shipping_price,
                                req.body.iduser,
                                req.body.user_address_id,
                                insertPaymentMethod.insertId]);
                            }else{
                                const insertAddress = await mysql.execute(`INSERT INTO ADDRESS (NAME,ADDRESS,DISTRICT,CITY,STATE,COUNTRY,CEP,STATUS,USER_IDUSER) VALUES (?,?,?,?,?,?,?,?,?)`,
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
                                     insertOrder2 = await mysql.execute(`INSERT INTO EXOTICA_DB.ORDER (STATUS,DATE,TOTAL_PRICE,SHIPPING_PRICE,USER_IDUSER,ADDRESS_IDADDRESS,PAYMENT_METHOD_IDPAYMENT_METHOD) VALUES ( ?,?,?,?,?,?,?); `,
                                    [req.body.status,
                                    req.body.date,
                                    req.body.total_price,
                                    req.body.shipping_price,
                                    req.body.iduser,
                                    insertAddress.insertId,
                                    insertPaymentMethod.insertId]);

                                }else{return  res.status(500).send({message: 'Address not inserted !' });}
                            }
                           // console.log(insertOrder1 ? insertOrder1.insertedId: insertOrder2.insertedId);
                            let idorder = insertOrder1 ? insertOrder1.insertId: insertOrder2.insertId;
                            console.log(idorder)
                            if(idorder){
                                // adiciona itens ao pedido e remove estoque
                               let itens =  req.body.products;

                               for (let index = 0; index < itens.length; index++) {
                                const insertItem = await mysql.execute(`INSERT INTO PRODUCT_HAS_ORDER (PRODUCT_IDPRODUCT,ORDER_IDORDER,QUANTITY,SIZE) values (?,?,?,?)`,
                                [itens[index].idproduct,
                                idorder,
                                itens[index].quantity,
                                itens[index].size]);
                                if (insertItem.affectedRows > 0){
                                    const selectQuantity = await mysql.execute(`SELECT quantity FROM STOCK WHERE PRODUCT_IDPRODUCT = ? AND SIZE = ?`,
                                    [itens[index]['idproduct'],itens[index]['size']]);
                                    let curbal = selectQuantity[0].quantity - itens[index].quantity;
                                    console.log(`Item: ${itens[index]['idproduct']}\nTamanho: ${itens[index]['size']}\nSaldo anterior :${selectQuantity[0].quantity}\nQuantidade pedido: ${itens[index].quantity}\nSaldo atual: ${curbal}`) 
                                     const updateStock = await mysql.execute(`UPDATE STOCK SET QUANTITY = ? WHERE PRODUCT_IDPRODUCT = ? AND SIZE = ?`,
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
                    return  res.status(500).send({
                        message: 'Order not registred !'+error  
                    });
                }
               // return  res.status(200).send('a');
                
            }
        
        }
    } catch (error) {
        return  res.status(500).send({
            message: 'Order not registred !'+error
            
        });
    }




    
});




module.exports = router;