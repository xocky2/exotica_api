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

    const result = await mysql.execute("select * from products;");
    let string =JSON.stringify(result);
    let json =JSON.parse(string);
    let produtos = result;

    const result2 = await mysql.execute(`select url from images where products_idproducts = ?;`,[result[0].idproducts]);
    
    let imgs = [];
    result2.forEach(images2 => {
        imgs.push(images2.url)
    });
    


    let string2 =JSON.stringify(result2);
    let json2 =JSON.parse(string2);

    const response = {
        status: 200,
        products: json.map(product =>{
            return {
                id: product.idproducts,
                name: product.name,
                categoria: product.categoria,
                price: product.price,  
                images: imgs          
            }
        })
    }

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