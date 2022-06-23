const express = require('express');
const router = express.Router();
const mysql = require('../mysql');
const multer = require('multer');


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
    res.header("Access-Control-Allow-Origin", "*");
    try {
        const query = `SELECT * FROM PRODUCT`;
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

        }

        //adiciona estoque
        for (let index = 0; index <= tamanho; index++) {
            const resultStock = await mysql.execute(`select size,quantity from stock where product_idproduct=?;`,[jsonProduct[index]['idproduct']]);
            pool.end()
            let stringStock =JSON.stringify(resultStock);
            let jsonStock =JSON.parse(stringStock);
        
            let stocks = [];
            jsonStock.forEach(jsonStock => stocks.push({size:jsonStock['size'],quantity:jsonStock['quantity'] })); //cria array com dados do estoque
            jsonProduct[index].stock = stocks

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
                    price: product.price,  
                    images: product.images,
                    stock: product.stock       
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
router.post('/', async(req,res)=>{
    res.header("Access-Control-Allow-Origin", "*");
    try {
        if (req.body.name == null){
            return res.status(201).send({response: "Please enter a name for the product !! "});
        }else{
                //INSERE O PRODUTO NO BANCO  
                const resultInsertProduct = await mysql.execute(`insert into product (name,category,price,description,status) values (?,?,?,?,?)`,
                [req.body.name,req.body.category,req.body.price,req.body.description,req.body.status]);
                     
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

                const resultInsertedProduct = await mysql.execute(`select idproduct,name,category,price,description,status from product where idproduct = ?;`,
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
            } // end if se cadastrouBjs

        }
    } catch (error) {
        console.log("erro: "+error);
        return res.status(500).send({erro: error});
        
    }
});

//ATUALIZA UM PRODUTO
router.patch('/',async(req,res)=>{
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
            const query = `update product set name = ?,category = ?,price = ?,description = ?,status = ? where idproduct = ?`;
            console.log(query,[product.name,product.category,product.price,product.description,product.status,product.productid]);
            //ATUALIZA NO BANCO
            const resultUpdateProduct = await mysql.execute(query,
            [product.name,product.category,product.price,product.description,product.status,product.productid]);
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

//CADASTRA ESTOQUE
router.post('/stock', async (req,res)=>{
    
    let stringStock =JSON.stringify(req.body);
    let jsonStock =JSON.parse(stringStock);
    let stock = [];
    //cria array com os estoques enviados
    jsonStock.forEach(jsonStock => 
        stock.push({
        productid: jsonStock['productid'],
        size:jsonStock['size'],
        quantity:jsonStock['quantity'] 
    })); 
    

    stock.forEach(stock => {
        
        if(stock['productid'] && stock['quantity'] && stock['size']){
            console.log('Valido');
        }else{
            console.log('Invalido');
        }
    });



    // const jsonStock = {
    //     productid: req.body.productid,
    //     size: req.body.size,
    //     quantity: req.body.quantity
    // }
    
    // const stock = {
    //     item: map(item =>{
    //         return {
    //             productid: req.body.productid,
    //             size: req.body.size,
    //             quantity: req.body.quantity     
    //         }
    //     })

    // }
    //console.log(stock);
    
    
    try {
        res.status(200).send(stock)
    } catch (error) {
        res.status(500).send({message: 'Estoque não cadastrado'})
    }
});

// CADASTRA IMAGENS
router.post('/images',upload.array('image',4), async(req,res)=>{
    let fileName = res.req.files
    console.log(fileName)
    return  res.status(200).send(fileName);
});


module.exports = router;