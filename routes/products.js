const express = require('express');
const router = express.Router();
const mysql = require('../mysql');
const multer = require('multer');

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


router.get('/', async(req,res,next)=>{
    try {
        const resultProduct = await mysql.execute("select * from product;");
        let stringProduct =JSON.stringify(resultProduct);
        let jsonProduct =JSON.parse(stringProduct);
        let produtos = resultProduct;

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
            let stringStock =JSON.stringify(resultStock);
            let jsonStock =JSON.parse(stringStock);
        
            let stocks = [];
            jsonStock.forEach(jsonStock => stocks.push({size:jsonStock['size'],quantity:jsonStock['quantity'] }) ); //cria array com as urls das imagens
            jsonProduct[index].stock = stocks;

        }
        
        // constroi o response
    let  response = {
            status: 200,
            products: jsonProduct.map(product =>{
                return {
                    id: product.idproducts,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    price: product.price,  
                    main_image: product.main_image,
                    images: product.images,
                    stock: product.stock       
                }
            })
        }

        // cria array com url das imgs 

        return res.status(200).send({response});
    } catch (error) {
        return res.status(500).send({error: error})
    }
    
});


router.post('/', async(req,res,next)=>{
    try {
        if (req.body.name == null){
            return res.status(201).send({response: "Please enter a name for the product !! "});
        }else{
            const resultInsertProduct = await mysql.execute(`insert into product (name,category,price,main_image,description,visible) values (?,?,?,?,?,?)`,
                        [req.body.name,req.body.category,req.body.price,req.body.main_image,req.body.description,req.body.visible]);
            if(resultInsertProduct){
                let imgs = req.body.images;
                imgs.forEach(async imgs  => {
                    console.log(imgs);
                    const resultInsertedImage = await mysql.execute(`insert into image (url,product_idproduct) values (?,?);`,
                        [imgs,resultInsertProduct.insertId]);

                    })     
                
                
                
                const resultInsertedProduct = await mysql.execute(`select name,category,price,main_image,description,visible from product where idproduct = ?;`,
             [resultInsertProduct.insertId]);
                if(resultInsertedProduct){
                    const responseInsertedProduct = {
                        status: 200,
                        product: resultInsertedProduct.map(product =>{
                            return {
                                id: product.idproducts,
                                name: product.name,
                                description: product.description,
                                category: product.category,
                                price: product.price,  
                                main_image: product.main_image,
                                //images: product.images
                              //  stock: product.stock       
                            }
                        })

                    }
                    return res.status(201).send({responseInsertedProduct});
                }else{
                    return res.status(401).send({response: {status: 401,
                    msg: "Product not inserted"}});
                }
            } // end if se cadastrou

        }
    } catch (error) {
        return res.status(500).send({error: error});
    }
});


module.exports = router;