let mysql = require('mysql2');
let config = require('../config');

let pool = mysql.createPool(config.mysql);

let query = (sql, options, callback) => {
    pool.getConnection((err, conn) => {
        if (err) {
            callback(err, null, null);
        } else {
            conn.query(sql, options, (err, results, fields) => {
                //事件驱动回调
                callback(err, results, fields);
            });
            conn.release();
        }
    })
}
module.exports = query;