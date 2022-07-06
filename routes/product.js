const express = require('express');
const router = express.Router();
const mysql = require('../mysql');
const multer = require('multer');
const { Router } = require('express');
const login = require('../middleware/jwt');
const mongoose = require('mongoose');


mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017');

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

// cria o Schemma
const commentSchema = new mongoose.Schema({
    idproduct: { type: Number, min: 0, required: true },
    iduser: { type: Number, min: 0, required: true },
    name: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: String, required: true }
})

// armazenamento da imagem 
const storage = multer.diskStorage({
    destination: function (req,file,cb){
        cb(null, './uploads/')
    },
    
    filename: function(req,file,cb){
        let data = new Date().toISOString().replace(/:/g, '-') + '-';
        cb(null, data + file.originalname );
    }
});
const upload = multer({storage: storage});  

// RETORNA TODOS OS PRODUTOS
router.get('/',async(req,res)=>{
    try {
        const query = `SELECT * FROM product`;
        const resultProduct = await mysql.execute(query);        
        let stringProduct =JSON.stringify(resultProduct);
        let jsonProduct =JSON.parse(stringProduct);
        let tamanho = jsonProduct.length-1;
        

        //adiciona images
        for (let index = 0; index <= tamanho; index++) {
            const resultImage = await mysql.execute(`select url from image where product_idproduct = ?;`,[jsonProduct[index]['idproduct']]);
            let stringImage =JSON.stringify(resultImage);
            let jsonImage =JSON.parse(stringImage);

            let imgs = [];
            jsonImage.forEach(jsonImage => imgs.push(jsonImage['url']) ); //cria array com as urls das imagens
            jsonProduct[index].images = imgs;

        //adiciona estoque

            const resultStock = await mysql.execute(`select size,quantity from stock where product_idproduct=?;`,[jsonProduct[index]['idproduct']]);
            let stringStock =JSON.stringify(resultStock);
            let jsonStock =JSON.parse(stringStock);
        
            let stocks = [];
            jsonStock.forEach(jsonStock => stocks.push({size:jsonStock['size'],quantity:jsonStock['quantity'] })); //cria array com dados do estoque
            jsonProduct[index].stock = stocks

        //adiciona comentários MongoDB
            const Comments = mongoose.model('comment', commentSchema, 'comment');
            const docs = await Comments.find({"idproduct": jsonProduct[index]['idproduct']},{"__v":0}).lean().exec();
            jsonProduct[index].comments = docs
            
        }
        
        // constroi o response
    let  response = {
            status: 200,
            products: jsonProduct.map(product =>{
                return {
                    id: product.idproduct,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    subcategory: product.subcategory,
                    price: product.price,  
                    images: product.images,
                    stock: product.stock   ,
                    comments: product.comments    
                }
            })
        }

        // cria array com url das imgs 

        return res.status(200).send({response});
    } catch (error) {
        console.log("ERRO: "+error);
        return res.status(500).send({error: error})
    }
    
});

// CADASTRA UM PRODUTO
router.post('/',login.adm, async(req,res)=>{
    try {
         if (req.body.name == null){
             return res.status(206).send({response: "Please enter a name for the product !! "});
         }else{
                //INSERE O PRODUTO NO BANCO  
                const resultInsertProduct = await mysql.execute(`insert into product (name,category,subcategory,price,description,status) values (?,?,?,?,?,?)`,
                [req.body.name,req.body.category,req.body.subcategory,req.body.price,req.body.description,req.body.status]);
                
            if(resultInsertProduct){
                let stock = [];
                if(req.body.stock){
                //CADASTRA ESTOQUE
                    
                //converte req stock para json
                let stringStock =JSON.stringify(req.body.stock); 
                let jsonStock =JSON.parse(stringStock);
                

                //cria array com o(s) estoque(s) enviado(s)
                jsonStock.forEach(jsonStock => 
                    stock.push({
                    productid: resultInsertProduct.insertId,
                    size:jsonStock['size'],
                    quantity:jsonStock['quantity'] 
                }));
            }
            console.log(stock);
            if(stock){
                stock.forEach(async stock => {
                    const queryStock = `insert into stock (size,quantity,product_idproduct) values (?,?,?);`;
                    const resultInsertedStock = await mysql.execute(queryStock,[stock['size'],stock['quantity'],stock['productid']]);
                    console.log(resultInsertedStock);
                });
            }
                const resultInsertedProduct = await mysql.execute(`select idproduct,name,category,subcategory,price,description,status from product where idproduct = ?;`,
                [resultInsertProduct.insertId]);
                
                if(resultInsertedProduct){
                    const response = {
                        status: 201,
                        product: resultInsertedProduct.map(product =>{
                            return {
                                id: product.idproduct,
                                name: product.name,
                                description: product.description,
                                category: product.category, 
                                subcategory: product.subcategory, 
                                price: product.price,
                                status: product.status,
                                stock: stock ? stock :'no stock'     
                            }
                        })

                    }
                    return res.status(201).send({response});
                }else{
                    return res.status(401).send({
                        response: {
                            status: 401,
                            msg: "Product not inserted"
                    }});
                }
            }

        }
    } catch (error) {
        console.log("erro: "+error);
        return res.status(500).send({erro: error});
        
    }
});

//DELETA UM PRODUTO
router.delete('/',login.adm,async(req,res)=>{
    try {
        if (req.body.productid){
            const resultDeletedProduct = await mysql.execute(`DELETE FROM product WHERE IDPRODUCT = ?;`,[req.body.productid]);
                if (resultDeletedProduct.affectedRows){
                    return res.status(200).send({
                        product: req.body.productid,
                        message: "Product deleted"
                    })
                }else{
                    return res.status(500).send({
                        product: req.body.productid,
                        message: "Product not deleted"
                    })
                }
        }
    } catch (error) {
        return req.status(500).send({Erro: error})
    }


});

//ATUALIZA UM PRODUTO
router.patch('/',login.adm,async(req,res)=>{
    try {
        if(!req.body.productid){
            return res.status(206).send({response: "Please enter a productid !! "});
        }else{
            // ATUALIZA O PRODUTO
            const product = {
                productid : req.body.productid,
                name: req.body.name,
                description: req.body.description,
                category : req.body.category,
                price: req.body.price,
                status: req.body.status
            }
            console.log(product);
            const query = `update product set name = ?,category = ?,subcategory = ?,price = ?,description = ?,status = ? where idproduct = ?`;
            console.log(query,[product.name,product.category,product.subcategory,product.price,product.description,product.status,product.productid]);
            //ATUALIZA NO BANCO
            const resultUpdateProduct = await mysql.execute(query,
            [product.name,product.category,product.subcategory,product.price,product.description,product.status,product.productid]);
            console.log(resultUpdateProduct);
            if(resultUpdateProduct){
                console.log(resultUpdateProduct.insertId);
                return res.status(200).send({
                    response: "Product updated",
                    product: product
                });
            }else{
                console.log(resultUpdateProduct.insertId);
                return res.status(304).send({
                    response: "Product not updated",
                });
            }




        }
    } catch (error) {
        return res.status(500).send({response:"Error : "+error});
    }

});

//ATUALIZA ESTOQUE
router.patch('/stock', async (req,res)=>{
    let stocks = req.body;
    let notUpdated = []
    for (let index = 0; index < stocks.stock.length; index++) {
        const item = stocks.stock[index];
        console.log(item.quantity,stocks.idproduct,item.size)
        const updateStock = await mysql.execute(`update stock set quantity = ? where product_idproduct = ? and size = ?`,[item.quantity,stocks.idproduct,item.size]);
        console.log(updateStock.affectedRows );
        if(updateStock.affectedRows == 0){
            notUpdated.push({size: item.size});
        }
    }
    if(notUpdated.length > 0){
        const response = {
            message: 'Stock not updated for this product(s)',
            item: notUpdated.map(not => {
                return {
                    size: not.size
                }
            })
        }
        console.log(response)
        return res.status(500).send(response);
    }else{
        return res.status(200).send({message: 'Stocks updated successfuly'});
    }
});

// CADASTRA IMAGENS
router.post('/images',login.adm,upload.single('image'), async(req,res)=>{
    let fileName = res.req.file
    console.log(fileName)
    try {
        const insertImage = await mysql.execute(`INSERT INTO image (URL,STATUS,PRODUCT_IDPRODUCT) VALUES (?,?,?)`,[fileName.path,req.body.status,req.body.idproduct]);
        console.log(insertImage);
        if(insertImage.insertId >0){
            return  res.status(200).send({message: 'Image inserted',url : fileName.path});
        }
        return  res.status(200).send(fileName.path);       
    } catch (error) {
        console.log(error);
        return  res.status(500).send({message: 'Error on upload image'+error});
    }


    

});

//CADASTRA COMENTARIO
router.post('/comment', async (req, res) => {
    console.log(req.body);
    const {idproduct,iduser,name,text } = req.body;
    const date = formatDate(new Date());
    const Comments = mongoose.model('comment', commentSchema, 'comment');
    const comment = new Comments({ idproduct,iduser,name, text, date });
    try {
      const insertComment =  await comment.save();
      //.then(res => console.log(res));
        return res.status(201).send('Comment created: \n'+insertComment);
    } catch (err) {
        return res.status(500).send('Comment not created :' + err);
    }
});



module.exports = router;