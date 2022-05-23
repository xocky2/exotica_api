const mysql = require('mysql');

/* var pool = mysql.createPool({
    "user": "root",
    "password": "",
    "database": "exotica_db",
    "host": "localhost",
    "port" : 3306,
    "connectionLimit": 1000
}); */


var pool = mysql.createPool({
    "user": process.env.MYSQL_USER,
    "password": process.env.MYSQL_PASSWORD,
    "database": process.env.MYSQL_DATABASE,
    "host": process.env.MYSQL_HOST,
    "port" : process.env.MYSQL_PORT,
    "connectionLimit": 1000
});

exports.execute=(query,params=[]) =>{
    return new Promise((resolve,reject)=>{
                pool.query(query,params,(error,result,fields)=>{
                    if(error){
                        console.log(error);
                        reject(error);
                    }else{
                        resolve(result);
                        console.log(result);
                    }
                })
           
    })
}

exports.pool = pool;