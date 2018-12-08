const express = require('express');
const router = express.Router();
const api = require('./api');
const func = require('./func');

// 登录session验证
router.get(api.res.verify, func.res.verify);
//退出
router.get(api.res.logout, func.res.logout);
// 邮箱注册
router.post(api.res.signup, func.res.signup);

//账号激活
router.get(api.res.active, func.res.active);

//用户登陆
router.post(api.res.thirdlogin, func.res.thirdlogin);

//用户登陆
router.post(api.res.login, func.res.login);
//snap登陆
router.post(api.res.snaplogin, func.res.snaplogin);

// 忘记密码 获取验证码
router.post(api.res.getverifycode, func.res.getverifycode);

//忘记密码注册码验证
router.post(api.res.checkcode, func.res.checkcode);

//修改密码
router.post(api.res.setpassword, func.res.setpassword);
//更新密码
router.post(api.res.updatepassword, func.res.updatepassword);
//个人信息
router.post(api.res.userinfo, upload.any(), func.res.userinfo);

//收藏，点赞，关注
router.post(api.res.useropreate, func.res.useropreate);

//新增删除修改文件
router.post(api.res.upload, upload.any(), func.res.upload);
//文件3发布 4 回收站 5 删除 6 取消发布 
router.post(api.res.dealfile, upload.any(), func.res.dealfile);
//获取项目
router.all(api.res.getfile, func.res.getfile);

//测试图片
// router.post(api.res.testimg, func.res.testimg);
//读取文件列表
router.post(api.res.filelist, func.res.filelist);
//读取资源商城列表
router.post(api.res.resourcelist, func.res.resourcelist);
//采集删除 素材
router.post(api.res.collectmaterial, func.res.collectmaterial);
//上传资源素材
router.post(api.res.uploadresource, upload.any(), func.res.uploadresource);

// 编程猫保存文件
// router.post('/res/saveproject', upload.any(), function(req, res, next) {
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
// router.post('/res/saveproject', upload.any(), function(req, res, next) {
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

// 玩具车
router.post(api.toycar.project, func.toycar.project);
router.post(api.toycar.projectList, func.toycar.projectList);

router.post(api.toycar.getproject, func.toycar.getproject);
router.get('/res/test', func.res.test);

module.exports = router;