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
            console.log(jsonProduct[index]['idproduct'])
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
                    main_image: product.main_image,
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
        return res.status(500).send({error: error})
    }
    
});


router.post('/', async(req,res,next)=>{
    const result = await mysql.execute("select * from products;");
    console.log(typeof result);
    let string =JSON.stringify(result);
    let json =JSON.parse(string);
    return res.status(200).send(json);
});

module.exports = router;