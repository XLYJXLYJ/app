//import { connect } from 'tls';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var nodemailer = require('nodemailer')
var smtpTransport = require('nodemailer-smtp-transport');
var cors = require('cors')
const uuid = require('node-uuid')

var index = require('./routes/index');
var users = require('./routes/users');
var sendMail = require('./mail/mail')
const tool = require('./common/tool');

var fs = require('fs');
var multer = require('multer');
// 配置multer参数,设置上传文件存储路径为uploads
// var upload = multer({ dest: 'upload/' });
var storage = multer.memoryStorage();
var upload = multer({
    storage: storage
});
const deststorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './file/headportrait')
    },
    filename: function(req, file, cb) {
        let name = uuid.v1();
        let index = tool.randomString(6);
        let fieldname = `${name}${index}.png`;
        cb(null, fieldname)
    }
})
const destupload = multer({
    storage: deststorage
})

const modelstorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './file/model');
    },
    filename: function(req, file, cb) {
        let name = uuid.v1();
        let index = tool.randomString(6);
        let fieldname = `${name}${index}`;
        cb(null, fieldname)
    }
})

const modelupload = multer({
    storage: modelstorage
})

var session = require('express-session');
var RedisStore = require('connect-redis')(session);
//xml2js
var xml2js = require('xml2js');
var parseString = require('xml2js').parseString;
var jsonBuilder = new xml2js.Builder();

var NodeRSA = require('node-rsa');
var logger = require('./common/logger');
var reqlogger = logger.getLogger();
var errlogger = logger.getLogger('err');
var othlogger = logger.getLogger('oth');
var app = express();
logger.useLogger(app, reqlogger);
var router = express.Router();
var api = require('./routes/api');
var func = require('./routes/func');
// var webRouter = require('./routes/router');

var syncUser = require('./routes/syncUser');


/*
let corsopt = { maxAge: 900, optionsSuccessStatus: 200 };
app.options('*', cors(corsopt));
*/

/*新增start 调取opencart接口*/
// var opentcart_opt = {
//     host: 'localhost',
//     port: '3306',
//     method: 'POST',
//     path: '',
//     Headers: {
//         "Content-Type": 'application/json',
//         "Content-Length": data.length
//     }
// };
/*end*/


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/*
//CORS middleware
var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000/snap/');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
app.use(allowCrossDomain);
*/

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json({
    limit: '100mb',
}));
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '10mb',
}));
app.use(cookieParser('xuduomi_forum_secret'));

app.use(session({
    secret: 'xuduomi_secret',
    store: new RedisStore({
        port: 6379,
        host: '127.0.0.1',
        db: 0,
        pass: '',
    }),
    resave: false,
    saveUninitialized: false,
}));

// 设置上传文件大小
// app.use(express.bodyParser({
//     limit: '10000kb'
// }));
// app.use(express.json({ limit: '10000kb' }));
app.use(express.static(path.join(__dirname, 'public')));

//-- manykit

app.use("/blockly", function(req, res, next) {
    if (req.path == "/")
        res.redirect('/blockly/apps/px2blockly/index.html');
    else
        next();
})
app.use("/blockly", express.static("webs/blockly", { etag: false, dotfiles: "allow", index: false }));
app.use("/snap", express.static("webs/snap", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/code", express.static("webs/code", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/book", express.static("webs/book", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/zeronerobot", express.static("webs/zeronerobot", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/model", express.static("webs/model", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/html5game", express.static("webs/html5game", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/toycar", express.static("webs/toycar", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/home", express.static("webs/home", { etag: false, dotfiles: "allow", index: "index.html" }));
app.use("/static", express.static("file"));
app.post("/", function(req, res, next) {
    console.log(JSON.stringify(req.body));
});

// 登录session验证
app.get(api.res.verify, func.res.verify);
//第三方用户登录
app.use(api.res.thirdlogin, func.res.thirdlogin);
//退出
app.get(api.res.logout, func.res.logout);
// 邮箱注册
app.use(api.res.signup, func.res.signup);

//账号激活
app.use(api.res.active, func.res.active);

//用户登陆
app.use(api.res.login, func.res.login);

//snap用户登陆
app.use(api.res.snaplogin, func.res.snaplogin);

// 忘记密码 获取验证码
app.use(api.res.getverifycode, func.res.getverifycode);

//忘记密码注册码验证
app.use(api.res.checkcode, func.res.checkcode);

//修改密码
app.use(api.res.setpassword, func.res.setpassword);
//更新密码
app.use(api.res.updatepassword, func.res.updatepassword);

//个人信息
app.use(api.res.userinfo, upload.any(), func.res.userinfo);

//收藏，点赞，关注
app.use(api.res.useropreate, func.res.useropreate);

//新增删除修改文件编程猫
app.post(api.res.upload, upload.any(), func.res.upload);
//文件3发布 4 回收站 5 删除 6 取消发布 
app.post(api.res.dealfile, upload.any(), func.res.dealfile);
//获取项目
app.use(api.res.getfile, func.res.getfile);

//测试图片
// app.post(api.res.testimg, func.res.testimg);
//读取文件列表
app.post(api.res.filelist, func.res.filelist);
//读取资源商城列表
app.post(api.res.resourcelist, func.res.resourcelist);
//采集删除 素材
app.post(api.res.collectmaterial, func.res.collectmaterial);
//上传资源素材
app.post(api.res.uploadresource, upload.any(), func.res.uploadresource);

// 编程猫保存文件
// app.post('/res/saveproject', upload.any(), function(req, res, next) {
//         var body = req.body;
//         var fileBuffer = req.files[0].buffer;
//         //文件名
//         var fileOriginalname = req.files[0].originalname;
//         //后缀名所对应的MIME类型 
//         var fileMimetype = req.files[0].mimetype;
//         console.log(body);
//         console.log(fileOriginalname);
//         console.log(fileMimetype);
//         console.log(fileBuffer);
//         var data = '';
//         var rsfile = fs.createReadStream(fileBuffer);
//         rsfile.on("data", function(chunk) {
//             console.log('进入了');
//             data += chunk;
//         });
//         rsfile.on("end", function() {
//             console.log('结束了');
//             console.log(data);
//         })
//     })
// app.post('/res/saveproject', upload.any(), function(req, res, next) {
//         console.log('调用了接口');
//         var buffers = [];
//         req.on('data', function(chunk) {
//             console.log(req.body);
//             console.log('处理数据');
//             buffers.push(chunk);
//         });
//         req.on('end', function() {
//             req.rawBody = Buffer.concat(buffers);
//             // req.rawBody = Buffer.concat(buffers).toString();
//             console.log('处理完成');
//             // console.log(req.rawBody);
//         })
//     })
/* end */
//-- manykit

//3D素材
//上传头像和封面图
app.use(api.material.uploadHeadPortrait, upload.any(), func.material.uploadHeadPortrait);
//上传素材
app.use(api.material.uploadmaterial, upload.any(), func.material.uploadmaterial);
//获取素材
app.use(api.material.getmodule, func.material.getmodule);
//处理素材
app.use(api.material.dealmodule, func.material.dealmodule);
//获取素材列表
app.use(api.material.modulelist, func.material.modulelist);
//作者信息
app.use(api.material.userinfo, destupload.any(), func.material.userinfo);
//收藏，点赞，关注
app.use(api.material.useropreate, func.material.useropreate);
//评论素材
app.use(api.material.commentmodule, func.material.commentmodule);
//评论素材列表
app.use(api.material.getcomment, func.material.getcomment);
//获取消息列表
app.use(api.material.getmessage, func.material.getmessage);


// 玩具车
app.post(api.toycar.project, func.toycar.project);
app.post(api.toycar.projectList, func.toycar.projectList);

app.use(api.toycar.getproject, func.toycar.getproject);
app.use('/res/test', func.res.test);

//mark文档转化为html
app.use(api.tool.mdToHtml, upload.any(), func.tool.mdToHtml);

/* 机器人音乐 */
//音乐榜单top
app.use(api.music.list, func.music.list);
//搜索音乐
app.use(api.music.search, func.music.search);
//播放音乐
app.use(api.music.song, func.music.song);


// app.use('/', index);
// app.use('/', webRouter);
// app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    errlogger.error(err);
    return res.status(500).send({
        errmsg: '服务器开小差了',
        status: 500
    });
});
module.exports = app;