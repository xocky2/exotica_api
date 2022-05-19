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

    const resultProduct = await mysql.execute("select * from product;");
    let string =JSON.stringify(resultProduct);
    let jsonProduct =JSON.parse(string);
    let produtos = resultProduct;

    let tamanho = jsonProduct.length-1;
    console.log(tamanho)
    
    for (let index = 0; index <= tamanho; index++) {
        const result2 = await mysql.execute(`select url from image where product_idproduct = ?;`,[jsonProduct[index]['idproduct']]);
        let string2 =JSON.stringify(result2);
        let json2 =JSON.parse(string2);

        let imgs = [];
        json2.forEach(json2 => imgs.push(json2['url']) ); //cria array com as urls das imagens
        jsonProduct[index].images = imgs;

    }
    
   let  response = {
        status: 200,
        products: jsonProduct.map(product =>{
            return {
                id: product.idproducts,
                name: product.name,
                category: product.category,
                price: product.price,  
                images: product.images         
            }
        })
    }

    // cria array com url das imgs 

    return res.status(200).send({response});
});


router.post('/', async(req,res,next)=>{
    const result = await mysql.execute("select * from products;");
    console.log(typeof result);
    let string =JSON.stringify(result);
    let json =JSON.parse(string);
    return res.status(200).send(json);
});

module.exports = router;