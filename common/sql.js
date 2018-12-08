const query = require('./db');
const publicSql = (sql, params) => {
    const promise = new Promise((resolve, reject) => {
        const handler = (err, result) => {
            if (err) {
                return err;
                reject(err)
            } else {
                resolve(result)
            }
        };
        query(sql, params, handler);
    });
    return promise;
}
module.exports = publicSql;