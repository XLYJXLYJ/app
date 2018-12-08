// let mysql = require('mysql2');

var mongoose = require('mongoose');
var uuid = require('node-uuid');
var utility = require('utility');
var bcrypt = require('bcryptjs');
var moment = require('moment');

let mongoDB = 'mongodb://127.0.0.1/forum';

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


module.exports = {
    // mysql: {
    //     signup(username, mail, password) {
    //         let codeSql = "INSERT INTO `manykit_user` SET `username`=?, `mail`=?, `password`=?,`state` = ?";
    //         let codeParams = [username, mail, password, 0];
    //         connection.query(codeSql, codeParams, (err, result) => {
    //             if (err) {
    //                 console.log('[ERROR] - ', err.message);
    //             } else {
    //                 console.log('插入成功');
    //             }
    //         })
    //     },
    //     active(username) {
    //         let codeSql = 'UPDATE `manykit_user` SET cdkey = ?,state = ? WHERE `username` = ?';
    //         let codeParams = ['null', "1", username];
    //         connection.query(codeSql, codeParams, (err, result) => {
    //             if (err) {
    //                 console.log('[ERROR] - ', err.message);
    //             } else {
    //                 console.log('成功激活');
    //             }
    //         })
    //     },
    //     resetPass(username, password) {
    //         let codeSql = 'UPDATE `manykit_user` SET password = ? WHERE `username` = ?';
    //         let codeParams = [password, username];
    //         connection.query(codeSql, codeParams, (err, result) => {
    //             if (err) {
    //                 console.log('[ERROR] - ', err.message);
    //             } else {
    //                 console.log('密码修改成功');
    //             }
    //         })
    //     }
    // },
    mongo: {
        test() {
            console.log(1111111111111111111)
        },
        signup(loginname, email, password) {
            let passhash = bcrypt.hashSync(password, 10);
            console.log(passhash + '==================');
            let avatarUrl = makeGravatar(email);
            newAndSave(loginname, loginname, passhash, email, avatarUrl, false, function(err, result) {
                if (err) {
                    console.log('新增错误');
                    return;
                } else {
                    console.log(result);
                }
            })

        },
        active(loginName) {
            User.findOne({
                'loginname': new RegExp('^' + loginName + '$', "i")
            }, function(err, user) {
                if (err) {
                    console.log('查找错误');
                    console.log(err);
                    return;
                } else {
                    console.log('查找成功');
                    console.log(user);
                    user.active = true;
                    user.save(function(err) {
                        if (err) {
                            console.log('激活错误');
                            console.log(err);
                        }
                    });
                }
            })
        },
        updatePass(email, password) {
            User.findOne({
                'email': new RegExp('^' + email + '$', "i")
            }, function(err, user) {
                if (err) {
                    console.log('查找错误');
                    console.log(err);
                    return;
                } else {
                    console.log('查找成功');
                    console.log(user);
                    let passhash = bcrypt.hashSync(password, 10);
                    user.pass = passhash;
                    user.save(function(err) {
                        if (err) {
                            console.log('修改密码错误');
                            console.log(err);
                        }
                    });
                }
            })
        },
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
        },


    }

}