let fs = require('fs');
let config = require("../config");

module.exports = {
    private_key: fs.readFileSync(__dirname + '/' + config.private_key + '', 'utf-8'),
    public_key: fs.readFileSync(__dirname + '/' + config.public_key + '', 'utf-8'),
}