/**
 * config
 */
//json注释文件
// {
//     "name": "manykit",
//     "version": "0.0.0",
//     "private": true,
//     "scripts": {
//       "start": "node ./bin/www"
//     },
//     "dependencies": {
//       "bcryptjs": "^2.4.3",//加密
//       "body-parser": "~1.18.2",//HTTP请求体解析中间件
//       "connect-redis": "^3.3.3",//a Redis session store backed by node_redis
//       "cookie-parser": "~1.4.3",//cookie解析中间件
//       "cors": "^2.8.4",//a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options
//       "debug": "~2.6.9",//A tiny JavaScript debugging utility modelled after Node.js core's debugging technique. Works in Node.js and web browsers.
//       "ejs": "~2.5.7",//渲染模板
//       "express": "~4.15.5",//express
//       "express-session": "^1.15.6",//cookie解析中间件
//       "moment": "^2.22.1",//A lightweight JavaScript date library for parsing, validating(合法化), manipulating(操作), and formatting(格式化) dates.
//       "mongoose": "^5.0.17",//数据库
//       "morgan": "~1.9.0",//Express框架使用morgan中间件记录日志
//       "multer": "^1.3.0",//文件上传中间件
//       "mysql2": "^1.5.1",//数据库
//       "node-rsa": "^0.4.2",//加密
//       "node-uuid": "^1.4.8",//用于生成唯一id
//       "nodemailer": "^4.4.1",//实现服务器向用户发送邮件
//       "nodemailer-smtp-transport": "^2.7.4",//实现服务器向用户发送邮件组件
//       "pixi.js": "^4.6.2",//The aim of this project is to provide a fast lightweight 2D library that works across all devices
//       "qrcode": "^1.2.0",//二维码
//       "serve-favicon": "~2.4.5",//serving a favicon
//       "utility": "^1.13.1",//提供了很多常用且比较杂的辅助方法，如 utility.md5()
//       "xml2js": "^0.4.19"//解析xml
//     }
//   }
var path = require('path');

var config = {
    //mysql 配置
    mysql: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'manykit0',
        port: '3306',
    },
    // mongodb 配置
    mongo: {
        db: 'mongodb://127.0.0.1/xuduomiForum',
    },
    // redis 配置，默认是本地
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        password: '',
    },
    auth_cookie_name: 'xuduomi_name',
    session_secret: 'xuduomi_secret',

    // 程序运行的端口
    port: 3000,

    //邮件配置
    email: {
        service: 'QQex',
        user: 'admin@manykit.com',
        pass: 'Promiseto1',
    },

    // 公钥
    public_key: 'rsa_public_key.pem',
    //私钥
    private_key: 'rsa_private_key.pem',

    //日志
    log_dir: path.join(__dirname, 'logs'),


    // 下面两个配置都是文件上传的配置

    // 7牛的access信息，用于文件上传
    qn_access: {
        accessKey: 'your access key',
        secretKey: 'your secret key',
        bucket: 'your bucket name',
        origin: 'http://your qiniu domain',
        // 如果vps在国外，请使用 http://up.qiniug.com/ ，这是七牛的国际节点
        // 如果在国内，此项请留空
        uploadURL: 'http://xxxxxxxx',
    },

    // 文件上传配置
    // 注：如果填写 qn_access，则会上传到 7牛，以下配置无效
    upload: {
        path: path.join(__dirname, 'public/upload/'),
        url: '/public/upload/'
    },
    file_limit: '100MB',
};

module.exports = config;