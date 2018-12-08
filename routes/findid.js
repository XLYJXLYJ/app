// let mysql = require('mysql2');

var mongoose = require('mongoose');

var User = require('./user_model');

let mongoDB = 'mongodb://127.0.0.1/xuduomiForum';

mongoose.connect(
    mongoDB, 
    { useNewUrlParser: true },
    {
    server: {
        auto_reconnect: true,
        poolSize: 20,
        useMongoClient: true
    }
}, function(err) {
    if (err) {
        // logger.error('connect to %s error: ', mongoDB, err.message);
        process.exit(1);
    }
});

moment.locale('zh-cn'); // 使用中文


// const connection = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: 'root',
//     database: 'manykit0',
//     port: '3306',
// });


module.exports = {
        getID(loginname, callback) {
            let condition;
            if (loginname.indexOf('@') !== -1) {
                condition = {
                    'email': loginname
                }
            } else {
                condition = {
                    'loginname': new RegExp('^' + loginname + '$', "i")
                }
            }
            console.log(condition);

            User.findOne(condition, function(err, user) {
                if (err) {
                    console.log('查找错误');
                    console.log(err);
                    return;
                } else {
                    console.log('查找成功');
                    let id = user['_id'];
                    callback(id)
                }
            })
			  
    }

}