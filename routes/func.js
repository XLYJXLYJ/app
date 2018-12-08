const fs = require('fs');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer')
const smtpTransport = require('nodemailer-smtp-transport');
const cors = require('cors');

const validator = require('validator');
const marked = require('marked');
const fetch = require('node-fetch');

const sendMail = require('./../mail/mail');
const credential = require('./../credential/credential');
const syncUser = require('./syncUser');
// const findid = require('./findid');
const uuid = require('node-uuid');
// const logger = require('./../common/logger');

const multer = require('multer');
// 配置multer参数,设置上传文件存储路径为uploads
// const upload = multer({ dest: 'upload/' });
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage
});



//xml2js
const xml2js = require('xml2js');
const parseString = require('xml2js').parseString;
const jsonBuilder = new xml2js.Builder();

const NodeRSA = require('node-rsa');
const query = require('./../common/db');
const tool = require('./../common/tool');
const responseResult = require('./../common/responseResult');
var publicSql = require('./../common/sql');
var rules = require('./../common/rule');
var emailContent = require('./../common/emailContent');

var config = require('../config');
const sql = {
    getNamebyId(id, callback) {
        let codeSql = 'SELECT username FROM manykit_user WHERE id = ?';
        let codeParams = [id];
        query(codeSql, codeParams, (err, result) => {
            if (err) {
                console.log('[ERROR] - ', err.message);
                return responseResult.error(res, '服务器开小差了~');
            } else if (result.length !== 0) {
                callback(result[0].username)
            } else {
                callback(false)
            }
        })

    },
};
module.exports = {
    res: {
        test(req, res, next) {

        },
        verify(req, res, next) {
            let publicKey = credential.public_key;
            //判断session状态,如果有效则返回给主页 或者cookie
            let auth_token = req.signedCookies['xuduomi'];
            let userid;
			let password;
            if (auth_token) {
                userid = auth_token.split('$$$$')[1];
            }
            if (userid) {
                let codeSql = 'SELECT id,username,headportrait,message,password FROM manykit_user WHERE id = ?';
                let codeParams = [userid];
                publicSql(codeSql, codeParams).then((result) => {
                    if (result.length !== 0) {
                        let username = result[0].username;
						let password = result[0].password;
                        let message = [];
                        if (result[0].message) {
                            message = JSON.parse(result[0].message);
                            Array.from(message, (value) => {
                                value.comment_time = tool.formatDate(value.comment_time, true);
                                return value
                            })
                        }

                        let data = {
                            username: username,
                            userid: userid,
                            message: message,
							password: password,
                            headportrait: result[0].headportrait,
                            publicKey: publicKey
                        };
                        return responseResult.success(res, data);
                    } else {
                        let data = {
                            publicKey: publicKey
                        };
                        responseResult.success(res, data);
                    }
                }).catch((err) => {
                    return next(err);
                })
            } else {
                let data = {
                    publicKey: publicKey
                };
                responseResult.success(res, data);
            }
        },
        logout(req, res, next) {
			openid='';
            req.session.destroy();
            res.clearCookie('xuduomi', {
                path: '/'
            });
            responseResult.success(res);
        },
        signup(req, res, next) {
            let mail = validator.trim(req.body.mail).toLowerCase();
            let username = validator.trim(req.body.username).toLowerCase();
			let username01 = username;
            let passwordRsa = req.body.password;
			//论坛注册需要的参数
			let state = req.body.state?req.body.state:0;
			let openid = req.body.openid?req.body.openid:1;
			let qqname = req.body.info;
            let password;
            let cdkey = tool.randomString(18);
            if (tool.ArrIsEmpty([mail, username, passwordRsa])) {
                return responseResult.error(res, '信息不完整');
            }
            // let privatekey = new NodeRSA(credential.private_key);
            // password = privatekey.decrypt(passwordRsa, 'utf8');
            // if (username.length < rules.username.minLength) {
                // return responseResult.error(res, '用户名至少需要' + rules.username.minLength + '个字符。');
            // } else if (username.length > rules.username.maxLength) {
                // return responseResult.error(res, '用户名最多可以使用' + rules.username.maxLength + '个字符。');
            // } else if (!rules.username.username(username)) {
                // return responseResult.error(res, rules.username.prompot);
            // } else if (!validator.isEmail(mail)) {
                // return responseResult.error(res, '邮箱不合法。');
            // } else if (!rules.password.password(password)) {
                // return responseResult.error(res, rules.password.prompot);
            // } else if (password.length > rules.password.minLength) {
                // return responseResult.error(res, '密码至少需要' + rules.password.minLength + '个字符。');
            // } else if (password.length > rules.password.minLength) {
                // return responseResult.error(res, '密码最多可以使用' + rules.password.maxLength + '个字符。');
            // }
			
			password = passwordRsa;
            let codeSql = 'SELECT `mail`,`state` FROM manykit_user WHERE `mail` = ?';
            let codeParams = [mail];
            let headerReferer = req.headers.referer.split('/')[3];
            publicSql(codeSql, codeParams).then((result) => {
                let data = JSON.parse(JSON.stringify(result))[0];
                if (result.length !== 0) {
                    // 用户已经存在
                    let state = parseInt(data.state);
                    //验证用户是否激活账号 0未激活 1激活
                    if (state === 1) {
                        responseResult.error(res, '邮箱已经注册，请找回密码');
                    } else {
                        responseResult.error(res, '请去邮箱点击激活链接，激活账号');
                    }
                } else {
                    //验证用户名是否存在
                    let codeSql = 'SELECT username FROM manykit_user WHERE mail = ? OR openid = ?';
                    let codeParams = [mail,openid];
                    publicSql(codeSql, codeParams).then((result) => {
                        let data = JSON.parse(JSON.stringify(result));
                        if (result.length === 0) {
								let codeSql = "INSERT INTO `manykit_user` SET `username`=?, `mail`=?, `password`=?,`cdkey` = ?,`state` = ?";
								let codeParams = [username, mail, password, cdkey, state];
                            publicSql(codeSql, codeParams).then((result) => {
                                let data = JSON.parse(JSON.stringify(result));
                                let resDate = {
                                    msg: '请前往邮箱' + mail + ',激活账号',
                                };
                                emailContent.activeEmail(mail, username, cdkey, headerReferer, (mailCnt) => {
                                    sendMail(mail, 'Welcome to ManyKit!', mailCnt);
                                });
                                syncUser.mongo.signup(username, mail, password);
                                responseResult.success(res, resDate);
                                // 有效期24小时
                                setTimeout(() => {
                                    let codeSql = 'SELECT state FROM manykit_user WHERE mail = ?';
                                    let codeParams = [mail];
                                    query(codeSql, codeParams, (err, result) => {
                                        if (err) {
                                            console.log('[SELECT ERROR] - ', err.message);
                                        } else {
                                            let data = JSON.parse(JSON.stringify(result))[0];
                                            let state = parseInt(data.state);
                                            console.log('状态' + state);
                                            if (state === 0) {
                                                let codeSql = 'DELETE FROM `manykit_user` WHERE `mail` = ?';
                                                let codeParams = [mail];
                                                query(codeSql, codeParams, (err, result) => {
                                                    if (err) {
                                                        console.log('[DELETE ERROR] - ', err.message);
                                                    }
                                                })
                                            }
                                        }
                                    })
                                }, 86400000);

                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
							let codeSql = "UPDATE `manykit_user` SET `username`=?,`qqname`=?, `mail`=?, `password`=?,`cdkey` = ?,`isband` = ?,`state` = ? WHERE `openid` = ?";
							let codeParams = [username,qqname,mail,password,cdkey,'1','1',openid];
							
                            publicSql(codeSql, codeParams).then((result) => {
                                let data = JSON.parse(JSON.stringify(result));
                                let resDate = {
                                    msg: '绑定成功',
                                };

                                syncUser.mongo.signup(username, mail, password);
                                responseResult.success(res, resDate);
                                // 有效期24小时
                                setTimeout(() => {
                                    let codeSql = 'SELECT state FROM manykit_user WHERE mail = ?';
                                    let codeParams = [mail];
                                    query(codeSql, codeParams, (err, result) => {
                                        if (err) {
                                            console.log('[SELECT ERROR] - ', err.message);
                                        } else {
                                            let data = JSON.parse(JSON.stringify(result))[0];
                                            let state = parseInt(data.state);
                                            console.log('状态' + state);
                                            if (state === 0) {
                                                let codeSql = 'DELETE FROM `manykit_user` WHERE `mail` = ?';
                                                let codeParams = [mail];
                                                query(codeSql, codeParams, (err, result) => {
                                                    if (err) {
                                                        console.log('[DELETE ERROR] - ', err.message);
                                                    }
                                                })
                                            }
                                        }
                                    })
                                }, 86400000);

                            }).catch((err) => {
                                return next(err);
                            })
                            responseResult.error(res, '用户名已存在');
                        }
                    }).catch((err) => {
                        return next(err);
                    })
                }
            }).catch((err) => {
                return next(err);
            })
        },
        active(req, res, next) {
            let key = req.query.cdkey;
            let temp_key = key.substring(key.length - 18, key.length);
            let temp_user = key.substring(0, key.length - 18);
            let website = req.query.a;
            let codeSql = 'SELECT id,username FROM `manykit_user` WHERE `username` = ? AND `cdkey` = ?';
            let codeParams = [temp_user, temp_key];
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    let data = JSON.parse(JSON.stringify(result))[0];
                    let username = data.username;
                    let id = data.id;
                    // 清除验证码 账号激活
                    let codeSql = 'UPDATE `manykit_user` SET cdkey = ?,state = ? WHERE `username` = ?';
                    let codeParams = ['null', "1", temp_user];
                    publicSql(codeSql, codeParams).then((result) => {
                        req.session.username = username;
                        req.session.userid = id;
                        syncUser.mongo.active(temp_user);
                        res.redirect('/' + website + '');
                    }).catch((err) => {
                        return next(err);
                    })
                } else {
                    // 用户不存在
                    res.set('refresh', '5;url=https://www.manykit.com/' + website + '');
                    res.send('激活码错误,请重新注册激活');
                }
            }).catch((err) => {
                return next(err);
            })
        },
        login(req, res, next) {
            let username = validator.trim(req.body.username).toLowerCase()? validator.trim(req.body.username).toLowerCase():req.query.username;
            let passwordRsa = validator.trim(req.body.password)?validator.trim(req.body.password):req.query.password;
			let openid = req.body.openid?req.body.openid:0;
			let info = req.body.info?req.body.info:0;
			let qqid = req.body.qqid?req.body.qqid:0;
            let password;
			let getid;
            // if (tool.ArrIsEmpty([username, passwordRsa])) {
                // return responseResult.error(res, '信息不完整');
            // }
            // let privatekey = new NodeRSA(credential.private_key);
			// privatekey.setOptions({encryptionScheme: 'pkcs1'})
            // password = privatekey.decrypt(passwordRsa, 'utf8');
            // if (tool.ArrIsEmpty([password])) {
                // return responseResult.error(res, '密码不可为空');
            // } else if (!rules.password.password(password)) {
                // return responseResult.error(res, rules.password.prompot);
            // }
            // let codeSql = 'SELECT `id`,`username`,`password`,`state` FROM `manykit_user` WHERE `username` = ? OR `mail` = ?';
            // let codeParams = [username, username];
            // if (tool.arrisempty([password])) {
                // return responseresult.error(res, '密码不可为空');
            // } else if (!rules.password.password(password)) {
                // return responseresult.error(res, rules.password.prompot);
            // }
			password = passwordRsa;
            let codeSql = 'SELECT `id`,`username`,`password`,`state` FROM `manykit_user` WHERE `username` = ? OR `mail` = ?';
            let codeParams = [username, username];
            publicSql(codeSql, codeParams).then((result) => {
                let data = JSON.parse(JSON.stringify(result))[0];
                if (result.length !== 0) {
                    let resPassword = data.password;
                    if (data.state == '0') {
                        //账号没有激活
                        responseResult.error(res, '此账号没有激活');
                    } else if (data.state == '1') {
                        // 登陆成功
                        if (password == resPassword) {
							if(openid!==0){
									var codeSql = "UPDATE `manykit_user` SET `qqname`=?,`isband` = ?,`openid` = ? WHERE `username` = ? OR `mail` = ?";
									var codeParams = [info,'1',openid,username,username];
									publicSql(codeSql, codeParams).then((result) => {
									}).catch((err) => {
										return next(err);
									})
									var codeSql = "DELETE FROM `manykit_user` WHERE `id` = ?";
									var codeParams = [qqid];
									publicSql(codeSql, codeParams).then((result) => {
									}).catch((err) => {
										return next(err);
									})
								}
								req.session.username = data.username;
								req.session.userid = data.id;
								var opts = {
									path: '/',
									maxAge: 1000 * 60 * 60 * 24 * 30,
									signed: true,
									httpOnly: true
								};
								getid = data.id;
								if (getid) {
									var token = getid + '$$$$' + data.id;
									let opts = {
										path: '/',
										maxAge: 1000 * 60 * 60 * 12,
										signed: true,
										httpOnly: true
									};
									res.cookie('xuduomi', token, opts); //cookie 有效期12小时
								}
								let resData = {
									id: data.id,
									username: data.username,
								};
								responseResult.success(res, resData);
						}else {
                            responseResult.error(res, '密码错误');
                        }
                    }
                } else {
                    //账号不存在
                    responseResult.error(res, '此账号不存在');
                }
            }).catch((err) => {
                return next(err);
            })

        },

        snaplogin(req, res, next) {
            let username = validator.trim(req.query.username).toLowerCase();
            let password = validator.trim(req.query.password);
			let getid;
            // if (tool.ArrIsEmpty([username, passwordRsa])) {
                // return responseResult.error(res, '信息不完整');
            // }
            // let privatekey = new NodeRSA(credential.private_key);
			// privatekey.setOptions({encryptionScheme: 'pkcs1'})
            // password = privatekey.decrypt(passwordRsa, 'utf8');
            // if (tool.ArrIsEmpty([password])) {
                // return responseResult.error(res, '密码不可为空');
            // } else if (!rules.password.password(password)) {
                // return responseResult.error(res, rules.password.prompot);
            // }
            // let codeSql = 'SELECT `id`,`username`,`password`,`state` FROM `manykit_user` WHERE `username` = ? OR `mail` = ?';
            // let codeParams = [username, username];
            // if (tool.arrisempty([password])) {
                // return responseresult.error(res, '密码不可为空');
            // } else if (!rules.password.password(password)) {
                // return responseresult.error(res, rules.password.prompot);
            // }	
            let codeSql = 'SELECT `id`,`username`,`password`,`state` FROM `manykit_user` WHERE `username` = ? OR `mail` = ?';
            let codeParams = [username, username];
            publicSql(codeSql, codeParams).then((result) => {
                let data = JSON.parse(JSON.stringify(result))[0];
                if (result.length !== 0) {
                    let resPassword = data.password;
                    if (data.state == '0') {
                        //账号没有激活
                        responseResult.error(res, '此账号没有激活');
                    } else if (data.state == '1') {
                        // 登陆成功
                        if (password == resPassword) {
                            req.session.username = data.username;
                            req.session.userid = data.id;
                            var opts = {
                                path: '/',
                                maxAge: 1000 * 60 * 60 * 24 * 30,
                                signed: true,
                                httpOnly: true
                            };
							getid = data.id;
							if (getid) {
								var token = getid + '$$$$' + data.id;
								let opts = {
									path: '/',
									maxAge: 1000 * 60 * 60 * 24 * 30,
									signed: true,
									httpOnly: true
								};
								res.cookie('xuduomi', token, opts); //cookie 有效期30天
							}
							let resData = {
								id: data.id,
								username: data.username,
							};
							responseResult.success(res, resData);

                        } else {
                            responseResult.error(res, '密码错误');
                        }
                    }
                } else {
                    //账号不存在
                    responseResult.error(res, '此账号不存在');
                }
            }).catch((err) => {
                return next(err);
            })

        },


        thirdlogin(req, res, next) {
			let userid = req.body.userid;
			let qqopenid = req.body.openid;
			let qqaccesstoken = req.body.accesstoken;
			let qquserinfo = req.body.info;
            // let type = parseInt(req.body.type ? req.body.type : req.query.type);
			let type = 1;
            if (tool.ArrIsEmpty([type])) {
                return responseResult.error(res, '信息不完整');
            }
            if (type === 1) {//qq登陆
                let openid = req.body.openid;
                let accesstoken = req.body.accesstoken;
                let userinfo = req.body.info;
                if (tool.ArrIsEmpty([openid, accesstoken, userinfo])) {
                    return responseResult.error(res, '信息不完整');
                }
            } else if (type == 2) {//微信登陆
                let code = req.query.code;
                const appid = `wx3f489c60ac73547e`;
                const secret = `dfe6325cf27e2058005978bcf12d9f09`;
                let url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${secret}&code=${code}&grant_type=authorization_code`;
                try {
                    fetch(url).then(data => data.json()).then(json => {
                        let url = `https://api.weixin.qq.com/sns/userinfo?access_token=${json.access_token}&openid=${json.openid}`;
                        // return responseResult.success(res, {
                        //         dd: url
                        //     })
                        try {
                            fetch(url).then(data => data.json()).then(json => {
                                return responseResult.success(res, {
                                    dd: json
                                })
                            })
                        } catch (err) {
                            return responseResult.success(res, {
                                dd: '错'
                            })
                        }

                    })
                } catch (err) {
                    return responseResult.success(res, {
                        dd: '错'
                    })
                }
            };
			let codeSql = "SELECT id,username,isband,password FROM `manykit_user` WHERE `openid` = ?";
			let openid = req.body.openid;
			let accesstoken = req.body.accesstoken;
			let userinfo = req.body.info;
			var codeParams = [openid, type];
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
						let data = JSON.parse(JSON.stringify(result))[0];
						req.session.username = data.username;
						req.session.userid = data.id;
						var opts = {
							path: '/',
							maxAge: 1000 * 60 * 60 * 24 * 30,
							signed: true,
							httpOnly: true
						};
						getid = data.id;
						if (getid) {
							var token = getid + '$$$$' + data.id;
							let opts = {
								path: '/',
								maxAge: 1000 * 60 * 60 * 24 * 30,
								signed: true,
								httpOnly: true
							};
							res.cookie('xuduomi', token, opts); //cookie 有效期30天
						}
						let resData = {
							id: data.id,
							username: data.username,
							isband:data.isband,
							password:data.password
						};
						responseResult.success(res, resData);							
                    // return responseResult.success(res, {
                        // "id": data.id,
						
                    // })
                } else {
					if(userid){
						let codeSql = 'UPDATE `manykit_user` SET `qqname`=?,`state` = ?,`type` = ?,`isband` = ?,`openid` = ? WHERE `id` = ?';
						let codeParams = [qquserinfo, 1, 1, 1, qqopenid,userid];
						publicSql(codeSql, codeParams).then((result) => {
						});
						responseResult.success(res, '绑定成功');
					}else{
						let qqname = userinfo;
						let codeSql = "INSERT INTO `manykit_user` SET `qqname`=?,`state` = ?,`type` = ?,`isband` = ?,`openid` = ?";
						let codeParams = [qqname, 1, 1, 0,openid];
						publicSql(codeSql, codeParams).then((result) => {
							let codeSql = 'SELECT id FROM `manykit_user` WHERE `openid` = ? AND `type` = ?';
							let codeParams = [openid, type];
							publicSql(codeSql, codeParams).then((result) => {
							let data = JSON.parse(JSON.stringify(result))[0];
							req.session.username = data.qqname;
							req.session.userid = data.id;
							var opts = {
								path: '/',
								maxAge: 1000 * 60 * 60 * 24 * 30,
								signed: true,
								httpOnly: true
							};
							getid = data.id;
							if (getid){
								var token = getid + '$$$$' + data.id;
								let opts = {
									path: '/',
									maxAge: 1000 * 60 * 60 * 24 * 30,
									signed: true,
									httpOnly: true
								};
								res.cookie('xuduomi', token, opts); //cookie 有效期30天
							}
							let resData = {
								id: data.id,
								qqname: data.qqname,
								isbind:data.isbind
							};
							responseResult.success(res, resData);
								// return responseResult.success(res, {
									// "id": data.id,
								// })
							}).catch((err) => {
								return next(err);
							})
						}).catch((err) => {
							return next(err);
						})

					}
						
                }
            }).catch((err) => {
                return next(err);
            })
		
        },
        getverifycode(req, res, next) {
            let mail = validator.trim(req.body.mail).toLowerCase();
            if (!validator.isEmail(mail)) {
                return responseResult.error(res, '邮箱不合法。');
            }
            let codeSql = 'SELECT * FROM `manykit_user` WHERE `mail` = ?';
            let codeParams = [mail];
            let code = tool.randomString(6, '0123456789');
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    let codeSql = 'UPDATE `manykit_user` SET code = ? WHERE `mail` = ?';
                    let codeParams = [code, mail];
                    publicSql(codeSql, codeParams).then((result) => {
                            let resDate = {
                                msg: '验证码已发至' + mail + ',请前往接收',
                            };
                            responseResult.success(res, resDate);
                            emailContent.codeEmail(code, (mailCnt) => {
                                sendMail(mail, 'Welcome to ManyKit!', mailCnt);
                            });
                        }).catch((err) => {
                            return next(err);
                        })
                        // 有效期10分钟
                    setTimeout(() => {
                        let codeSql = 'UPDATE `manykit_user` SET code = ? WHERE `mail` = ?';
                        let codeParams = ['', mail];
                        query(codeSql, codeParams, (err, result) => {
                            if (err) {
                                console.log('[INSERT ERROR] - ', err.message);
                            }
                        })
                    }, 600000);
                } else {
                    // 用户不存在
                    responseResult.error(res, '不存在该用户');
                }
            }).catch((err) => {
                return next(err);
            })

        },
        checkcode(req, res, next) {
            let mail = validator.trim(req.body.mail).toLowerCase();
            let code = parseInt(validator.trim(req.body.code));
            if (tool.ArrIsEmpty([mail, code])) {
                return responseResult.error(res, '信息不完整');
            }
            let codeSql = 'SELECT code FROM `manykit_user` WHERE `mail` = ?';
            let codeParams = [mail];
            publicSql(codeSql, codeParams).then((result) => {
                let data = JSON.parse(JSON.stringify(result))[0];
                if (result.length !== 0) {
                    let resCode = data.code;
                    if (code == resCode) {
                        let resData = {
                            msg: '验证成功'
                        };
                        responseResult.success(res, resData);
                        // 清除验证码
                        let codeSql = 'UPDATE `manykit_user` SET code = ? WHERE `mail` = ?';
                        let codeParams = ['null', mail];
                        query(codeSql, codeParams, (err, result) => {
                            if (err) {
                                console.log('[UPDATE ERROR] - ', err.message);
                            }
                        })
                    } else {
                        responseResult.error(res, '验证码错误');
                    }
                } else {
                    // 用户不存在
                    let errmsg = '用户不存在';
                    responseResult.error(res, errmsg)
                }
            }).catch((err) => {
                return next(err);
            })

        },
        setpassword(req, res, next) {
            req.session.mail = req.body.mail==undefined?req.session.mail:req.body.mail;
            let passwordRsa = req.body.password;
            let password;
            // if (tool.ArrIsEmpty([mail, passwordRsa])) {
                // return responseResult.error(res, '信息不完整');
            // }
            // let privatekey = new NodeRSA(credential.private_key);
            // password = privatekey.decrypt(passwordRsa, 'utf8');
            // if (tool.ArrIsEmpty([password])) {
                // return responseResult.error(res, '密码不可为空');
            // } else if (!rules.password.password(password)) {
                // return responseResult.error(res, rules.password.prompot);
            // }
			password = passwordRsa;
			 if (tool.ArrIsEmpty([mail, passwordRsa])) {
                return responseResult.error(res, '信息不完整');
            }
            let codeSql,
                codeParams;
            codeSql = 'UPDATE manykit_user SET password = ? WHERE mail = ?';
            codeParams = [password, mail];
            publicSql(codeSql, codeParams).then((result) => {
                req.session.username = null;
                req.session.userid = null;
                syncUser.mongo.updatePass(mail, password);
                responseResult.success(res)
            }).catch((err) => {
                return next(err);
            })
        },
        updatepassword(req, res, next) {
            let userid = parseInt(req.body.userid);
            let oldPassRsa = req.body.oldpass;
            let newPassRsa = req.body.newpass;
			let oldpassword,
			newpassword;
			
			oldpassword = oldPassRsa;
            newpassword = newPassRsa;
            // if (tool.ArrIsEmpty([userid, oldPassRsa, newPassRsa])) {
                // return responseResult.error(res, '信息不完整');
            // }
            // let privatekey = new NodeRSA(credential.private_key);
            // oldpassword = privatekey.decrypt(oldPassRsa, 'utf8');
            // newpassword = privatekey.decrypt(newPassRsa, 'utf8');
            // if (tool.ArrIsEmpty([oldpassword])) {
                // return responseResult.error(res, '旧密码不可为空');
            // } else if (tool.ArrIsEmpty([newpassword])) {
                // return responseResult.error(res, '新密码不可为空');
            // } else if (!rules.password.password(newpassword)) {
                // return responseResult.error(res, rules.password.prompot);
            // }
            let codeSql,
                codeParams;
            codeSql = 'SELECT id,password,mail FROM manykit_user  WHERE `id` = ? ';
            codeParams = [userid];
            publicSql(codeSql, codeParams).then((result) => {
                let password = result[0].password;
                let mail = result[0].mail;
                if (password == oldpassword) {
                    codeSql = 'UPDATE manykit_user SET password = ? WHERE id = ?';
                    codeParams = [newpassword, userid];
                    publicSql(codeSql, codeParams).then((result) => {
                        syncUser.mongo.updatePass(mail, newpassword);
                        responseResult.success(res)
                    }).catch((err) => {
                        return next(err);
                    })
                } else {
                    responseResult.error(res, '旧密码错误')
                }
            }).catch((err) => {
                return next(err);
            })

        },
		
        userinfo(req, res, next) {
            let userid = parseInt(req.body.userid);
			let Untieqq=parseInt(req.body.Untieqq)==0?0:null;
            if (tool.ArrIsEmpty([userid])) {
                return responseResult.error(res, '信息不完整');
            }
            //修改个人信息 1年龄性别 2 关于我的 3 我收藏的作品 4 我关注的人 5 关注我的人
            let state = parseInt(req.body.state);
            //1获取年龄性别 2 关于我的 3获取个人详细信息
            let getinfostate = parseInt(req.body.getinfostate);
            let pagenum = req.body.pagenum ? parseInt(req.body.pagenum) : 1;
            let pagesize = req.body.pagesize ? parseInt(req.body.pagesize) : 15;
            let start = (pagenum - 1) * pagesize;
            let age,
                sex,
                realname,
                imgBuffer,
                aboutme,
                doing,
                codeSql,
                codeParams,
				isband;
            if (state === 1) {
                age = req.body.age;
                sex = req.body.sex;
                realname = req.body.realname;
                imgBuffer = req.files ? req.files[0].buffer : '';
                codeSql = 'UPDATE manykit_user SET age = ?,sex = ?,realname=?,`imgBuffer`=? WHERE id = ?';
                codeParams = [age, sex, realname, imgBuffer, userid];
            } else if (state === 2) {
                aboutme = req.body.aboutme;
                doing = req.body.doing;
                codeSql = 'UPDATE manykit_user SET aboutme = ?,doing = ? WHERE id = ?';
                codeParams = [aboutme, doing, userid];
            } else if(Untieqq==0){
				codeSql = 'UPDATE manykit_user SET type = ?,qqname = ?,openid = ?,isband = ? WHERE `id` = ? ';
                codeParams = [0,null,null,0,userid];
            }else{
				codeSql = 'SELECT id,username,age,realname,sex,imgBuffer,aboutme,doing,mycollect,myattention,attentionme,coverworkid,isband FROM manykit_user  WHERE `id` = ? ';
                codeParams = [userid];
			}
            publicSql(codeSql, codeParams).then((result) => {
                let data = JSON.parse(JSON.stringify(result))[0];
                if (!getinfostate) {
                    if (state === 1 || state === 2) {
                        responseResult.success(res)
                    }else if(Untieqq==0){
						 let resData = {
                            isband:0,
                        }
                        responseResult.success(res, resData)
					} 
					else if (state === 3) {
                        if (data.mycollect) {
                            let temp_col1 = data.mycollect.split(",");
                            let temp_col2 = "'" + temp_col1.join(",") + "'";
                            let codeSql = 'select b.id, b.title, b.userid,b.imgBuffer,b.imgname,b.surfaceplot from manykit_userproject b where 1 = 1 and exists (select 1 from manykit_user a where FIND_IN_SET(b.id,a.mycollect)and a.id = ' + userid + ') limit ?,?';
                            let codeParams = [start, pagesize];
                            publicSql(codeSql, codeParams).then((result) => {
                                let temp_mycollect = JSON.parse(JSON.stringify(result));
                                let temp_arr1 = [];
                                for (let k = 0; k < temp_mycollect.length; k++) {
                                    temp_arr1.push(temp_mycollect[k].userid);
                                    if (parseInt(temp_mycollect[k].surfaceplot) === 9) {
                                        let id = temp_mycollect[k].id;
                                        let imgBuffer = result[k].imgBuffer;
                                        let imgname = temp_mycollect[k].imgname;
                                        let name = '' + id + '' + '' + imgname + '';
                                        let temp_name = './webs/zeronerobot/static/headPortraits/' + name;
                                        let writeStream = fs.createWriteStream(temp_name);
                                        writeStream.write(imgBuffer, 'UTF-8');
                                        writeStream.end();
                                        writeStream.on('finish', function() {
                                        });
                                        writeStream.on('error', function(err) {
                                            console.log(err.stack);
                                        })
                                        temp_mycollect[k].imgBuffer = '/zeronerobot/static/headPortraits/' + name;
                                    } else {
										// let id = temp_mycollect[k].id;
                                        let imgBuffer = result[k].imgBuffer;
                                        // let imgname = temp_mycollect[k].imgname;
                                        // let name = '' + id + '' + '' + imgname + '';
                                        // let temp_name = './webs/zeronerobot/static/headPortraits/' + name;
                                        // let writeStream = fs.createWriteStream(temp_name);
                                        // writeStream.write(imgBuffer, 'UTF-8');
                                        // writeStream.end();
                                        // writeStream.on('finish', function() {
                                            // // console.log('finish');
                                            // // console.log(temp_name);
                                        // });
                                        // writeStream.on('error', function(err) {
                                            // console.log(err.stack);
                                        // })
                                        temp_mycollect[k].imgBuffer = imgBuffer.toString('UTF-8', 0, imgBuffer.length);;
                                    }
                                }
                                let temp_str1 = temp_arr1.join(",");
                                let codeSql = 'SELECT id,username FROM manykit_user  WHERE find_in_set(id,?)';
                                let codeParams = [temp_str1];
                                publicSql(codeSql, codeParams).then((result) => {
                                    let data1 = JSON.parse(JSON.stringify(result));
                                    let temp_auth = {};
                                    for (let i = 0; i < data1.length; i++) {
                                        temp_auth[data1[i].id] = data1[i].username;
                                    }
                                    for (let j = 0; j < temp_mycollect.length; j++) {
                                        temp_mycollect[j].auth = temp_auth[temp_mycollect[j].userid]
                                    }
                                    responseResult.success(res, temp_mycollect)
                                }).catch((err) => {
                                    return next(err);
                                })
                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
                            responseResult.error(res)
                        }
                    } else if (state === 4) {
                        if (data.myattention) {
                            let codeSql = 'SELECT id,username,imgBuffer FROM manykit_user WHERE find_in_set(id,?) limit ?,?';
                            let codeParams = [data.myattention, start, pagesize];
                            publicSql(codeSql, codeParams).then((result) => {
                                let data = JSON.parse(JSON.stringify(result));
                                for (let i = 0; i < data.length; i++) {
                                    if (data[i].imgBuffer) {
                                        let imgBuffer = result[i].imgBuffer;
                                        let name = data[i].id + '.png';
                                        let temp_name = './webs/zeronerobot/static/headPortraits/' + name;
                                        let writeStream = fs.createWriteStream(temp_name);
                                        writeStream.write(imgBuffer, 'UTF-8');
                                        writeStream.end();
                                        writeStream.on('finish', function() {
                                        });
                                        writeStream.on('error', function(err) {
                                            console.log(err.stack);
                                        })
                                        data[i].imgBuffer = '/zeronerobot/static/headPortraits/' + name;
                                    }
                                }
                                responseResult.success(res, data)
                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
                            responseResult.error(res)
                        }
                    } else if (state === 5) {
                        if (data.attentionme) {
                            let codeSql = 'SELECT id,username,imgBuffer FROM manykit_user  WHERE find_in_set(id,?) limit ?,?';
                            let codeParams = [data.attentionme, start, pagesize];
                            publicSql(codeSql, codeParams).then((result) => {
                                let data = JSON.parse(JSON.stringify(result));
                                for (let i = 0; i < data.length; i++) {
                                    if (data[i].imgBuffer) {
                                        let imgBuffer = result[i].imgBuffer;
                                        let name = data[i].id + '.png';
                                        let temp_name = './webs/zeronerobot/static/headPortraits/' + name;
                                        let writeStream = fs.createWriteStream(temp_name);
                                        writeStream.write(imgBuffer, 'UTF-8');
                                        writeStream.end();
                                        writeStream.on('finish', function() {
                                        });
                                        writeStream.on('error', function(err) {
                                            console.log(err.stack);
                                        })
                                        data[i].imgBuffer = '/zeronerobot/static/headPortraits/' + name;
                                    }
                                }
                                responseResult.success(res, data)
                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
                            responseResult.error(res)
                        }
                    } else {
                        let resData = {
                            aboutme: data.aboutme,
                            doing: data.doing,
                        }
                        responseResult.success(res, resData)
                    }
                } else {
                    if (getinfostate === 1) {
                        let content = result[0].imgBuffer;
                        let buf;
                        if (content) {
                            buf = content.toString('Base64', 0, content.length);
                        } else {
                            buf = '';
                        }
                        let resData = {
                            age: data.age,
                            sex: data.sex,
                            realname: data.realname,
                            imgBuffer: buf,
							isband: data.isband
                        }
                        responseResult.success(res, resData)
                    } else if (getinfostate === 2) {
                        let resData = {
                            aboutme: data.aboutme,
                            doing: data.doing,
                        }
                        responseResult.success(res, resData)
                    } else if (getinfostate === 3) {
                        let content = result[0].imgBuffer;
                        let buf;
                        if (content) {
                            buf = content.toString('Base64', 0, content.length);
                        } else {
                            buf = '';
                        }
                        let codeSql = 'SELECT collecttotal,praisetotal,looktotal FROM manykit_userproject  WHERE `userid` = ? AND `state` = 1';
                        let codeParams = [userid];
                        publicSql(codeSql, codeParams).then((result) => {
                            let collecttotal = 0,
                                praisetotal = 0,
                                looktotal = 0;
                            let data1 = JSON.parse(JSON.stringify(result));
                            for (let obj of data1) {
                                collecttotal += parseInt(obj.collecttotal);
                                praisetotal += parseInt(obj.praisetotal);
                                looktotal += parseInt(obj.looktotal);
                            }
                            let resData = {
                                age: data.age,
                                sex: data.sex,
                                username: data.username,
                                realname: data.realname,
                                imgBuffer: buf,
                                aboutme: data.aboutme,
                                doing: data.doing,
                                coverworkid: data.coverworkid,
                                collecttotal: collecttotal,
                                praisetotal: praisetotal,
                                looktotal: looktotal,
                            }
                            responseResult.success(res, resData)
                        }).catch((err) => {
                            return next(err);
                        })
                    }
                }
            }).catch((err) => {
                return next(err);
            })
        },
        useropreate(req, res, next) {
            //1收藏 2 取消收藏3 点赞 4 取消点赞 5 关注 6 取消关注
            let state = parseInt(req.body.state);
            let userid = parseInt(req.body.userid);
            if (tool.ArrIsEmpty([userid, state])) {
                return responseResult.error(res, '信息不完整');
            }
            if (state === 1 || state === 2) {
                let id = req.body.id;
                let codeSql = 'SELECT mycollect FROM manykit_user  WHERE `id` = ? ';
                let codeParams = [userid];
                publicSql(codeSql, codeParams).then((result) => {
                    let data;
                    if (result.length !== 0) {
                        data = JSON.parse(JSON.stringify(result));
                        let temp_arr;
                        if (data[0].mycollect) {
                            temp_arr = data[0].mycollect.split(',');
                        } else {
                            temp_arr = [];
                        }
                        if (state === 1) {
                            temp_arr.push(id.toString());
                        } else {
                            let index = temp_arr.indexOf(id.toString());
                            if (index !== -1) {
                                temp_arr.splice(index, 1);
                            } else {
                                // console.log('不存在');
                            }
                        }
                        data = temp_arr.join(",");
                    } else {
                        data = id;
                    }
                    let codeSql = 'UPDATE manykit_user SET mycollect = ? WHERE id = ?';
                    let codeParams = [data, userid];
                    publicSql(codeSql, codeParams).then((result) => {
                        let codeSql = 'SELECT collect FROM manykit_userproject  WHERE `id` = ? ';
                        let codeParams = [id];
                        publicSql(codeSql, codeParams).then((result) => {
                            let temp_str,
                                temp_length;
                            if (result.length !== 0) {
                                let temp_arr;
                                var data = JSON.parse(JSON.stringify(result));
                                if (data[0].collect) {
                                    temp_arr = data[0].collect.split(',');
                                } else {
                                    temp_arr = [];
                                }
                                if (state === 1) {
                                    temp_arr.push(userid.toString());
                                } else {
                                    var index = temp_arr.indexOf(userid.toString());
                                    if (index !== -1) {
                                        temp_arr.splice(index, 1);
                                    } else {
                                        // console.log('不存在');
                                    }
                                }
                                temp_length = temp_arr.length;
                                temp_str = temp_arr.join(",");
                            } else {
                                temp_str = userid;
                                temp_length = 1;
                            }
                            var codeSql = 'UPDATE manykit_userproject SET collect = ?,collecttotal = ? WHERE id = ?';
                            var codeParams = [temp_str, temp_length, id];
                            publicSql(codeSql, codeParams).then((result) => {
                                responseResult.success(res)
                            }).catch((err) => {
                                return next(err);
                            })
                        }).catch((err) => {
                            return next(err);
                        })
                    }).catch((err) => {
                        return next(err);
                    })
                }).catch((err) => {
                    return next(err);
                })
            } else if (state === 3 || state === 4) {
                let id = req.body.id;
                let codeSql = 'SELECT praise FROM manykit_userproject  WHERE `id` = ? ';
                let codeParams = [id];
                publicSql(codeSql, codeParams).then((result) => {
                    let temp_str,
                        temp_length;
                    if (result.length !== 0) {
                        let temp_arr;
                        let data = JSON.parse(JSON.stringify(result));
                        if (data[0].praise) {
                            temp_arr = data[0].praise.split(',');
                        } else {
                            temp_arr = [];
                        }
                        if (state === 3) {
                            temp_arr.push(userid.toString());
                        } else {
                            var index = temp_arr.indexOf(userid.toString());
                            if (index !== -1) {
                                temp_arr.splice(index, 1);
                            } else {
                                console.log('不存在');
                            }
                        }
                        temp_length = temp_arr.length;
                        temp_str = temp_arr.join(",");
                    } else {
                        temp_str = id;
                        temp_length = 1;
                    }
                    var codeSql = 'UPDATE manykit_userproject SET praise = ?,praisetotal = ? WHERE id = ?';
                    var codeParams = [temp_str, temp_length, id];
                    publicSql(codeSql, codeParams).then((result) => {
                        responseResult.success(res)
                    }).catch((err) => {
                        return next(err);
                    })
                }).catch((err) => {
                    return next(err);
                })
            } else if (state === 5 || state === 6) {
                let attentionid = parseInt(req.body.attentionid);
                let codeSql = 'SELECT myattention FROM manykit_user  WHERE `id` = ? ';
                let codeParams = [userid];
                publicSql(codeSql, codeParams).then((result) => {
                    let data;
                    if (result.length !== 0) {
                        let temp_arr;
                        data = JSON.parse(JSON.stringify(result));
                        if (data[0].myattention) {
                            temp_arr = data[0].myattention.split(',');
                        } else {
                            temp_arr = [];
                        }
                        if (state === 5) {
                            temp_arr.push(attentionid.toString());
                        } else {
                            var index = temp_arr.indexOf(attentionid.toString());
                            if (index !== -1) {
                                temp_arr.splice(index, 1);
                            } else {
                                console.log('不存在');
                            }
                        }
                        data = temp_arr.join(",");
                    } else {
                        data = attentionid;
                    }
                    let codeSql = 'UPDATE manykit_user SET myattention = ? WHERE id = ?';
                    let codeParams = [data, userid];
                    publicSql(codeSql, codeParams).then((result) => {
                        let codeSql = 'SELECT attentionme FROM manykit_user  WHERE `id` = ? ';
                        let codeParams = [attentionid];
                        publicSql(codeSql, codeParams).then((result) => {
                            let data;
                            if (result.length !== 0) {
                                let temp_arr;
                                data = JSON.parse(JSON.stringify(result));
                                if (data[0].attentionme) {
                                    temp_arr = data[0].attentionme.split(',');
                                } else {
                                    temp_arr = [];
                                }
                                if (state === 5) {
                                    temp_arr.push(userid.toString());
                                } else {
                                    var index = temp_arr.indexOf(userid.toString());
                                    if (index !== -1) {
                                        temp_arr.splice(index, 1);
                                    } else {
                                        console.log('不存在');
                                    }
                                }
                                data = temp_arr.join(",");
                            } else {
                                data = userid;
                            }
                            var codeSql = 'UPDATE manykit_user SET attentionme = ? WHERE id = ?';
                            var codeParams = [data, attentionid];
                            publicSql(codeSql, codeParams).then((result) => {
                                responseResult.success(res)
                            }).catch((err) => {
                                return next(err);
                            })
                        }).catch((err) => {
                            return next(err);
                        })
                    }).catch((err) => {
                        return next(err);
                    })
                }).catch((err) => {
                    return next(err);
                })
            }

        },
        upload(req, res, next) {
            let id = parseInt(req.body.id)?parseInt(req.body.id):parseInt(req.query.id);
            let userid = parseInt(req.body.userid)?parseInt(req.body.userid):parseInt(req.query.userid);
            let title = req.body.title?req.body.title:req.query.title;
            let desc = req.body.desc?req.body.des:req.query.des;
			let imgBuffer = req.body.cover?req.body.cover:req.query.cover;
			let type = parseInt(req.body.type)?parseInt(req.body.type):parseInt(req.query.type);
			var files = req.body.files?req.body.files:req.query.files;								
			// imgBuffer = new Buffer(imgBuffer,'base64');
			// console.log(imgBuffer);
            if (tool.ArrIsEmpty([userid, title])) {
                return responseResult.error(res, '信息不完整');
            }
            //state 1 新增 2编辑 3 发布 4 回收站 5 删除
            let state = parseInt(req.body.state ? req.body.state : 1);
            let codeSql,
                codeParams,
                create_time,
				alreadytitle;
			if(type === 1){
				create_time = tool.localtime();
				codeSql = "INSERT INTO `manykit_userproject` SET `userid`=?,`type`=?,`title`=?, `desc`=?,`pcontext`=?,`create_time`=?";
				codeParams = [userid, 1, title, desc, files,create_time];
					publicSql(codeSql, codeParams).then((result) => {
				responseResult.success(res)
				}).catch((err) => {
					return next(err);
				})
			}else{
					for (let i = 0; i < req.files.length; i++) {
					//文件名
					let fileOriginalname = req.files[i].originalname;
					//后缀名所对应的MIME类型 
					let fileMimetype = req.files[i].mimetype;
					//二进制文件
					let fileBuffer = req.files[i].buffer;
					if (state === 1) {
						if(type==1){
							create_time = tool.localtime();
							codeSql = "INSERT INTO `manykit_userproject` SET `userid`=?,`type`=?,`name`=?,`title`=?, `desc`=?,`imgBuffer`=?,`content` = ?,`create_time` = ?";
							codeParams = [userid, type, fileOriginalname, title, desc, imgBuffer, fileBuffer,create_time];
							publicSql(codeSql, codeParams).then((result) => {
								responseResult.success(res,'success')
							}).catch((err) => {
								return next(err);
							})
						}else{
							//查询数据库中是否存在相同的文件名
							codeSql = "SELECT title FROM `manykit_userproject` WHERE userid= ?";
							codeParams = [userid];
							publicSql(codeSql, codeParams).then((result) => {
								let titlelength = JSON.parse(JSON.stringify(result)).length;
								var titletotal=[];
								for(let j=0;j<titlelength;j++){
									titletotal.push(JSON.parse(JSON.stringify(result))[j].title)
								}
								if(titletotal.includes(title)){
									create_time = tool.localtime();
									codeSql = "UPDATE `manykit_userproject` SET `name`=?, `desc`=?,`imgBuffer`=?,`content` = ?,`create_time` = ? WHERE userid= ? AND title= ?";
									codeParams = [fileOriginalname, desc, imgBuffer, fileBuffer,create_time,userid, title];
									publicSql(codeSql, codeParams).then((result) => {
										responseResult.success(res)
									}).catch((err) => {
										return next(err);
									})
								}else{
									create_time = tool.localtime();
									codeSql = "INSERT INTO `manykit_userproject` SET `userid`=?,`name`=?,`title`=?, `desc`=?,`imgBuffer`=?,`content` = ?,`create_time` = ?";
									codeParams = [userid, fileOriginalname, title, desc, imgBuffer, fileBuffer,create_time];
									publicSql(codeSql, codeParams).then((result) => {
										responseResult.success(res)
									}).catch((err) => {
										return next(err);
									})
								}
							}).catch((err) => {
								return next(err);
							})
						}
					} else if (state === 2) {
						codeSql = "UPDATE `manykit_userproject` SET `name`=?,`title`=?, `desc`=?,`content` = ? WHERE id = ?";
						codeParams = [fileOriginalname, title, desc, fileBuffer, id];
						publicSql(codeSql, codeParams).then((result) => {
							responseResult.success(res)
						}).catch((err) => {
							return next(err);
						})
					}
				}
			}

        },
		//snapupload snap保存文件
		snapupload(req, res, next) {
            let userid = parseInt(req.body.userid);
            let title = req.body.title;
            if (tool.ArrIsEmpty([userid, title, desc])) {
                return responseResult.error(res, '信息不完整');
            }
            //state 1 新增 2编辑 3 发布 4 回收站 5 删除
            let state = parseInt(req.body.state ? req.body.state : 1);
            let codeSql,
                codeParams,
                create_time;
            for (let i = 0; i < req.files.length; i++) {
                //文件名
                let fileOriginalname = req.files[i].originalname;
                //后缀名所对应的MIME类型 
                let fileMimetype = req.files[i].mimetype;
                //二进制文件
                let fileBuffer = req.files[i].buffer;
                if (state === 1) {
                    create_time = tool.localtime();
                    codeSql = "INSERT INTO `manykit_userproject` SET `userid`=?,`name`=?,`title`=?,`content` = ?,`create_time` = ?";
                    codeParams = [userid, fileOriginalname, title, fileBuffer, create_time];
                } else if (state === 2) {
                    codeSql = "UPDATE `manykit_userproject` SET `name`=?,`title`=?, `desc`=?,`content` = ? WHERE id = ?";
                    codeParams = [fileOriginalname, title, desc, fileBuffer, id];
                }
                publicSql(codeSql, codeParams).then((result) => {
                    if (state === 1) {
                        codeSql = "SELECT id FROM manykit_userproject WHERE userid = ? AND title = ? AND create_time = ?";
                        codeParams = [userid, title, create_time];
                        publicSql(codeSql, codeParams).then((result) => {
                            let projectid = JSON.parse(JSON.stringify(result))[0].id;
                            let resData = {
                                id: projectid
                            }
                            responseResult.success(res, resData)
                        }).catch((err) => {
                            return next(err);
                        })
                    } else {
                        responseResult.success(res)
                    }
                }).catch((err) => {
                    return next(err);
                })
            }
        },
		
		
        dealfile(req, res, next) {
            let id = req.body.id;
            let userid = req.body.userid ? req.body.userid : req.session.userid;
            //state 1 新增 2编辑 3 发布 4 回收站 5 删除 6还原到未发布状态
            let state = parseInt(req.body.state);
            if (tool.ArrIsEmpty([id])) {
                return responseResult.error(res, '信息不完整');
            }
            let coverworkid = req.body.coverworkid ? parseInt(req.body.coverworkid) : '';
            let codeSql,
                codeParams;
            if (state === 3) {
                let title = req.body.title;
                let desc = req.body.desc;
                //1-8 默认图片 9 
                let surfaceplot = parseInt(req.body.surfaceplot);
                if (surfaceplot === 9) {
                    let imgBuffer = req.files[0].buffer;
                    let fileOriginalname = req.files[0].originalname;
                    let publish_time = tool.localtime();
                    codeSql = "UPDATE `manykit_userproject` SET `state`=?,`title`=?,`desc`=?,`imgBuffer`=?,`imgname`=?,`surfaceplot`=?,`publish_time`=? WHERE id = ?";
                    codeParams = [1, title, desc, imgBuffer, fileOriginalname, surfaceplot, publish_time, id];
                } else {
                    let publish_time = tool.localtime();
                    codeSql = "UPDATE `manykit_userproject` SET `state`=?,`title`=?,`desc`=?,`surfaceplot`=?,`publish_time`=? WHERE id = ?";
                    codeParams = [1, title, desc, surfaceplot, publish_time, id];
                }

            } else if (state === 4) {
                let recycle_time = tool.localtime();
                codeSql = "UPDATE `manykit_userproject` SET `state`=?,`recycle_time`=? WHERE id = ?";
                codeParams = [2, recycle_time, id];
            } else if (state === 5) {
                codeSql = "DELETE FROM `manykit_userproject` WHERE id = ?";
                codeParams = [id];
            } else if (state === 6) {
                codeSql = "UPDATE `manykit_userproject` SET `state`=? WHERE id = ?";
                codeParams = [0, id];
            }
            publicSql(codeSql, codeParams).then((result) => {
                if (coverworkid) {
                    let codeSql = "UPDATE `manykit_user` SET `coverworkid`=? WHERE id = ?";
                    let codeParams = [coverworkid, userid];
                    publicSql(codeSql, codeParams).then((result) => {
                        responseResult.success(res)
                    }).catch((err) => {
                        return next(err);
                    })
                } else {
                    responseResult.success(res)
                }
            }).catch((err) => {
                return next(err);
            })
        },
        getfile(req, res, next) {
            let id = req.body.id ? req.body.id : req.query.id;
			let type = parseInt(req.body.type);
            let userid = parseInt(req.body.userid);
            //获取文件 1 获取文件发布数据 2 获取文件内容 3获取文件其他信息
            let state = req.body.state;
			//有问题
            // let headerreferer = req.headers.referer.split('/')[3];
            let codeSql,
                codeParams;
            if (state === 1) {
                codeSql = 'SELECT id,title,`desc`,imgBuffer,surfaceplot FROM manykit_userproject WHERE `id` = ?';
                codeParams = [id];
            } else if (state === 3) {
                codeSql = 'SELECT id,name,title,`desc`,praise,praisetotal,collect,collecttotal,looktotal,create_time,publish_time,recycle_time,userid FROM manykit_userproject WHERE `id` = ?';
                codeParams = [id];
            } else if(type ===1){
                codeSql = 'SELECT pcontext,title,`desc` FROM manykit_userproject WHERE id = ? AND type = 1';
                codeParams = [id];
            }else{
                codeSql = 'SELECT content FROM manykit_userproject WHERE `id` = ?';
                codeParams = [id];
            }
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    if (state === 1) {
                        let imgBuffer = result[0].imgBuffer;
                        let surfaceplot = result[0].surfaceplot;
                        if (surfaceplot == 9) {
                            imgBuffer = imgBuffer.toString('Base64', 0, imgBuffer.length);
                        } else {
                            imgBuffer = 'static/publish/surfaceplot' + surfaceplot + '.png';
                        }
                        let resData = {
                            id: result[0].id,
                            title: result[0].title,
                            desc: result[0].desc,
                            imgBuffer: imgBuffer,
                            surfaceplot: result[0].surfaceplot,
                        }
                        responseResult.success(res, resData)
                    } else if (state === 3) {
                        let projectData = JSON.parse(JSON.stringify(result))[0];
                        let looktotal = parseInt(projectData.looktotal) + 1;
                        let desc = projectData.desc;
                        let praise = projectData.praise;
                        let collect = projectData.collect;
                        let isPraise,
                            isCollect;
                        if (praise && praise.indexOf(userid) !== -1) {
                            isPraise = true;
                        } else {
                            isPraise = false;
                        }
                        if (collect && collect.indexOf(userid) !== -1) {
                            isCollect = true;
                        } else {
                            isCollect = false;
                        }
                        let authid = parseInt(projectData.userid);
                        let codeSql = 'SELECT id,username,imgBuffer,attentionme FROM manykit_user WHERE `id` = ?';
                        let codeParams = [authid];
                        publicSql(codeSql, codeParams).then((result) => {
                            if (result.length !== 0) {
                                let userData = JSON.parse(JSON.stringify(result))[0];
                                let name,
                                    imgBuffer,
                                    attentionme,
                                    isAttention;
                                if (userData.id) {
                                    name = userData.username;
                                    if (userData.imgBuffer) {
                                        imgBuffer = result[0].imgBuffer.toString('Base64', 0, userData.imgBuffer.length);
                                    } else {
                                        imgBuffer = userData.imgBuffer;
                                    }
                                    attentionme = userData.attentionme;
                                }
                                if (attentionme && attentionme.indexOf(userid) !== -1) {
                                    isAttention = true;
                                } else {
                                    isAttention = false;
                                }
                                let codeSql = 'UPDATE manykit_userproject set looktotal = ? WHERE `id` = ?';
                                let codeParams = [looktotal, id];
                                publicSql(codeSql, codeParams).then((result) => {
                                    let resData = {
                                        id: projectData.id, 
                                        title: projectData.title, //标题
                                        createtime: projectData.createtime, //时间
                                        publishtime: projectData.publish_time, //发布时间
                                        deletetime: projectData.recycle_time, //删除时间
                                        desc: desc, //作品描述
                                        looktotal: looktotal, //观看人数
                                        authid: authid, //作者id
                                        name: name, //作者名
                                        imgBuffer: imgBuffer, //作者头像
                                        isAttention: isAttention, //是否关注
                                        praisetotal: projectData.praisetotal, //赞过的总人数
                                        collecttotal: projectData.collecttotal, //收藏的总人数
                                        isPraise: isPraise, //是否赞过
                                        isCollect: isCollect, //是否收藏
                                    }
                                    responseResult.success(res, resData)
                                }).catch((err) => {
                                    return next(err);
                                })
                            }
                        }).catch((err) => {
                            return next(err);
                        })
                    } else if(type == 1){
                        let title = result[0].title;
                        let desc = result[0].desc;
                        let pcontext = result[0].pcontext;

                        let resData = {
                            title: title, //标题
                            desc: desc, //作品描述
                            pcontext: pcontext, //发布时间
                        }
						responseResult.success(res,resData)
					}else{
                        let content = result[0].content;
                        let buf = content.toString('UTF-8', 0, content.length);
                        let temp_name = './webs/zeronerobot/file/' + id + '.xml';
                        var writeStream = fs.createWriteStream(temp_name);
                        writeStream.write(buf, 'UTF-8');
                        writeStream.end();
                        writeStream.on('finish', function() {
                            res.sendfile(temp_name);
                        });
                        writeStream.on('error', function(err) {
                        })
                    }
                } else {
                    let data = {
                        data: {},
                        status: 200
                    }
                    responseResult.success(res, data)
                }
            }).catch((err) => {
                return next(err);
            })
        },
        filelist(req, res, next) {
            let userid = req.body.userid?req.body.userid:req.query.userid;
            //文件状态 0 未发布 1 已发布 2 删除
            let state = req.body.state;
            //列表状态排序 1排行榜（收藏） 2 推荐（点赞） 3 搜索
            let sortstate = req.body.sortstate;
            let searchname = req.body.searchname;
			let type = parseInt(req.body.type)?parseInt(req.body.type):parseInt(req.query.type);
            let temp_sort_arr = ['%', searchname, '%'];
            let temp_sort = temp_sort_arr.join('');
            let pagenum = req.body.pagenum ? parseInt(req.body.pagenum) : 1;
            let pagesize = req.body.pagesize ? parseInt(req.body.pagesize) : 15;
            let codeSql,
                codeParams,
                auth;
            if (typeof(userid) === 'undefined') {
                if(type==1){
                    let start = (pagenum - 1) * pagesize;
                    codeSql = 'SELECT id,title,`desc`,create_time,pcontext,address,(SELECT count(1) FROM manykit_userproject WHERE type = 1) as total FROM manykit_userproject WHERE `type` = ? limit ?, ?';
                    codeParams = [1,start, pagesize];
                }else{
                    let start = (pagenum - 1) * pagesize;
                    codeSql = 'SELECT id,title,`desc`,create_time,looktotal,praisetotal,collecttotal,imgBuffer,imgname,surfaceplot,(SELECT count(1) FROM manykit_userproject WHERE type = 0 && state = 1) as total FROM manykit_userproject  WHERE `state` = ? limit ?, ?';
                    codeParams = [state, start, pagesize];
                }
            } else {
                if(type==1){
                    codeSql = 'SELECT id,title,`desc`,create_time,(SELECT count(1) FROM manykit_userproject WHERE type = 1) as total FROM manykit_userproject WHERE `userid` = ? AND type = 1';
                    codeParams = [userid];
                }else{
                    codeSql = 'SELECT id,title,`desc`,create_time,looktotal,praisetotal,collecttotal,state,imgBuffer,imgname,surfaceplot FROM manykit_userproject WHERE `userid` = ? AND (`state` = 0 OR `state` = 1) AND type!=1';
                    codeParams = [userid];
                    publicSql(codeSql, codeParams).then((result) => {
                        if (result.length !== 0) {
                            let data = JSON.parse(JSON.stringify(result));
                            auth = data[0].username;
                        }
                    }).catch((err) => {
                        return next(err);
                    })
                    if (typeof(state) === "undefined") {
                        codeSql = 'SELECT id,title,`desc`,create_time,looktotal,praisetotal,collecttotal,state,imgBuffer,imgname,surfaceplot FROM manykit_userproject WHERE `userid` = ? AND (`state` = 0 OR `state` = 1) AND type!=1';
                        codeParams = [userid];
                    } else {
                        codeSql = 'SELECT id,title,`desc`,create_time,looktotal,state,update_time,praisetotal,collecttotal,imgBuffer,imgname,surfaceplot FROM manykit_userproject WHERE `userid` = ? AND `state` = ? AND type!=1';
                        codeParams = [userid, state];
                    }
                }
            }
            if (sortstate === 1) {
                codeSql = 'SELECT id,title,`desc`,create_time,looktotal,praisetotal,collecttotal,imgBuffer,imgname,surfaceplot FROM manykit_userproject  WHERE `state` = ? order by collecttotal desc limit ?, ?';
                codeParams = [1, 0, 10];
            } else if (sortstate === 2) {
                let start = (pagenum - 1) * pagesize;
                codeSql = 'SELECT id,title,`desc`,create_time,looktotal,praisetotal,collecttotal,imgBuffer,imgname,surfaceplot,(SELECT count(1) FROM manykit_userproject WHERE type = 0 && state = 1) as total FROM manykit_userproject  WHERE `state` = ? order by praisetotal desc limit ?, ?';
                codeParams = [1, start, pagesize];
            } else if (sortstate === 3) {
                let start = (pagenum - 1) * pagesize;
                codeSql = 'SELECT id,title,`desc`,create_time,looktotal,praisetotal,collecttotal,imgBuffer,imgname,surfaceplot FROM manykit_userproject  WHERE `state` = ? AND title like ? limit ?, ?';
                codeParams = [1, temp_sort, start, pagesize];
            }
			
            publicSql(codeSql, codeParams).then((result) => {
                let data = JSON.parse(JSON.stringify(result));
                if(type === 1){
                    res.send({
                        data: data,
                        status: 200
                    })
                }
                else if (result.length !== 0) {
                    let data = JSON.parse(JSON.stringify(result));
                    for (let i = 0; i < data.length; i++) {
                        let id = data[i].id;
                        if (data[i].surfaceplot === '9') {
                            let imgBuffer = result[i].imgBuffer;
                            let imgname = data[i].imgname;
                            let name = '' + id + '' + '' + imgname + '';
                            let temp_name = './webs/zeronerobot/static/headPortraits/' + name;
                            let writeStream = fs.createWriteStream(temp_name);
                            writeStream.write(imgBuffer, 'UTF-8');
                            writeStream.end();
                            writeStream.on('finish', function() {
                            });
                            writeStream.on('error', function(err) {
                            })
                            data[i].imgBuffer = '/zeronerobot/static/headPortraits/' + name;
                        } else {
							let imgBuffer = result[i].imgBuffer;
                            let name = '' + id + '' + '' + '.png' + '';
                            let temp_name = './webs/zeronerobot/static/headPortraits/' + name;
                            let writeStream = fs.createWriteStream(temp_name);
                            writeStream.write(imgBuffer, 'UTF-8');
                            writeStream.end();
                            writeStream.on('finish', function() {
                            });
                            writeStream.on('error', function(err) {
                            })
                            data[i].imgBuffer = imgBuffer.toString('UTF-8', 0, imgBuffer.length);
                        }
                    }
                    if (state === 1 && typeof(userid) === "undefined") {
                        res.send({
                            data: data,
                            pagenum: pagenum,
                            status: 200
                        })
                    }
                    else if (userid || sortstate) {
                        if (state === 1) {
                            res.send({
                                data: data,
                                auth: auth,
                                status: 200
                            })
                        } else {
                            responseResult.success(res, data)
                        }
                    }

                } else {
                    let resData = {
                        msg: '这回真的没有了~'
                    }
                    return responseResult.success(res, resData)
                }
            }).catch((err) => {
                return next(err);
            })
        },
        resourcelist(req, res, next) {
            let userid = req.body.userid;
            //1素材2场景3学习4游戏5音乐 6 课程
            let type = req.body.type;
            // if (tool.ArrIsEmpty([type])) {
            //     return responseResult.error(res, '信息不完整');
            // }
            //1最近更新 2 最多下载量
            let state = parseInt(req.body.state);
            let onenav = parseInt(req.body.onenav ? req.body.onenav : 0);
            let twonav = req.body.twonav ? req.body.twonav : 0;
            let threenav = req.body.threenav ? req.body.threenav : 0;
            let fournav = req.body.fournav ? req.body.fournav : 0;
            let searchname = req.body.searchname;
            let temp_sort_arr = ['%', searchname, '%'];
            let temp_sort = temp_sort_arr.join('');
            let pagenum = req.body.pagenum ? req.body.pagenum : 1;
            let pagesize = req.body.pagesize ? req.body.pagesize : 15;
            let start = (pagenum - 1) * pagesize;
            let codeSql,
                codeParams;
            if (type && userid) {
                if (searchname) {
                    codeSql = 'select b.id, b.name, b.type from manykit_resourcemall b where name like ? and onenav = ? and exists (select 1 from manykit_user a where FIND_IN_SET(b.id,a.mymaterial)and a.id = ?)';
                    codeParams = [temp_sort, type, userid];
                } else {
                    codeSql = 'select b.id, b.name, b.type from manykit_resourcemall b where onenav = ? and exists (select 1 from manykit_user a where FIND_IN_SET(b.id,a.mymaterial)and a.id = ?)';
                    codeParams = [type, userid];
                }
            } else {
                if (searchname) {
                    // codeSql = 'SELECT id,name, type,onenav,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE name like ?) as total FROM manykit_resourcemall WHERE name like ? LIMIT ?,?';
                    // codeParams = [temp_sort, temp_sort, start, pagesize];
                    codeSql = 'SELECT id,name, type,onenav,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE name like ?) as total FROM manykit_resourcemall WHERE name like ? ';
                    codeParams = [temp_sort, temp_sort];
                } else {
                    if (state) {
                        if (state === 1) {
                            codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ?) as total FROM manykit_resourcemall WHERE onenav = ? order by create_time desc LIMIT ?,?';
                        } else {
                            codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ?) as total FROM manykit_resourcemall WHERE onenav = ? order by collectTotal desc LIMIT ?,?';
                        }
                    } else {
                        codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ?) as total FROM manykit_resourcemall WHERE onenav = ? LIMIT ?,?';
                    }
                    codeParams = [onenav, onenav, start, pagesize];
                    if (twonav) {
                        if (state) {
                            if (state === 1) {
                                codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? order by create_time desc LIMIT ?,?';
                            } else {
                                codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? order by praisetotal desc LIMIT ?,?';
                            }
                        } else {
                            codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? LIMIT ?,?';
                        }
                        codeParams = [onenav, twonav, onenav, twonav, start, pagesize];
                        if (threenav) {
                            if (state) {
                                if (state === 1) {
                                    codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? order by create_time desc LIMIT ?,?';
                                } else {
                                    codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? order by praisetotal desc LIMIT ?,?';
                                }
                            } else {
                                codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? LIMIT ?,?';
                            }
                            codeParams = [onenav, twonav, threenav, onenav, twonav, threenav, start, pagesize];
                            if (fournav) {
                                if (state) {
                                    if (state === 1) {
                                        codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? and `fournav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? and `fournav` = ? order by create_time desc LIMIT ?,?';
                                    } else {
                                        codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? and `fournav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? and `fournav` = ? order by praisetotal desc LIMIT ?,?';
                                    }
                                } else {
                                    codeSql = 'SELECT id,name, type,collectUser,(SELECT count(1) FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? and `fournav` = ?) as total FROM manykit_resourcemall WHERE onenav = ? and `twonav` = ? and `threenav` = ? and `fournav` = ? LIMIT ?,?';
                                }
                                codeParams = [onenav, twonav, threenav, fournav, onenav, twonav, threenav, fournav, start, pagesize];
                            }
                        }
                    }
                }
            }
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    // for (let i = 0; i < result.length; i++) {
                    //     let id = result[i].id;
                    //     let type = result[i].type;
                    //     let content = result[i].content;
                    //     let name;
                    //     if (onenav === 6) {
                    //         name = result[i].name + '.' + type;
                    //     } else {
                    //         name = id + '.' + type;
                    //     }
                    //     let temp_name = './webs/zeronerobot/static/resource/' + name;
                    //     let writeStream = fs.createWriteStream(temp_name);
                    //     writeStream.write(content, 'UTF-8');
                    //     writeStream.end();
                    //     writeStream.on('finish', function() {
                    //         // console.log('finish');
                    //         // console.log(temp_name);
                    //     });
                    //     writeStream.on('error', function(err) {
                    //         console.log(err.stack);
                    //     })
                    // }
                    let data = JSON.parse(JSON.stringify(result));
                    let total = data[0].total ? data[0].total : 0;
                    let ImgNav = ['null', 'material', 'scene', 'study', 'game', 'music', 'class'];
                    for (let j = 0; j < data.length; j++) {
                        // data[j].isCollect = false;
                        // if (userid) {
                        //     let str = data[j].collectUser;
                        //     if (str) {
                        //         if (str.indexOf(userid) !== -1) {
                        //             data[j].isCollect = true;
                        //         }
                        //     }
                        // }
                        delete data[j].collectUser;
                        delete data[j].total;
                        if (onenav === 6 || onenav === 5) {
                            data[j].content = '/static/resource/' + ImgNav[onenav] + '/' + data[j].name + '.' + data[j].type + '';
                        } else if (searchname) {
                            let onenav = parseInt(data[j]["onenav"]);
                            if (onenav === 6 || onenav === 5) {
                                data[j].content = '/static/resource/' + ImgNav[onenav] + '/' + data[j].name + '.' + data[j].type + '';

                            } else {
                                data[j].content = '/static/resource/' + ImgNav[onenav] + '/' + data[j].id + '.' + data[j].type + '';
                            }
                        } else {
                            data[j].content = '/static/resource/' + ImgNav[onenav] + '/' + data[j].id + '.' + data[j].type + '';
                        }
                    }
                    res.send({
                        data: data,
                        pagenum: pagenum,
                        pagesize: pagesize,
                        total: total,
                        status: 200
                    })
                } else {
                    res.send({
                        data: {
                            msg: '这回真的没有了~'
                        },
                        status: 200
                    })
                }
            }).catch((err) => {
                return next(err);
            })

        },
        collectmaterial(req, res, next) {
            // var userid = req.body.userid;
            var id = req.body.id;
            if (tool.ArrIsEmpty([id])) {
                return responseResult.error(res, '信息不完整');
            }
            //1 采集 2 删除
            // var state = req.body.state;
            // var searchSql = 'SELECT mymaterial FROM manykit_user WHERE `id` = ?';
            // var searchParams = [userid];
            // query(searchSql, searchParams, function(err, result) {
            //     if (err) {
            //         console.log('[SELECT ERROR] - ', err.message);
            //     } else if (result.length !== 0) {
            //         if (result.length !== 0) {
            //             var data = JSON.parse(JSON.stringify(result));
            //             if (data[0].mymaterial) {
            //                 var temp_arr = data[0].mymaterial.split(',');
            //             } else {
            //                 var temp_arr = [];
            //             }
            //             var strid = id.toString();
            //             var index = temp_arr.indexOf(strid);
            //             if (state === 1) {
            //                 if (index !== -1) {
            //                     return res.send({
            //                         msg: '此素材已经采集过了',
            //                         status: 200
            //                     })
            //                 } else {
            //                     temp_arr.push(id);
            //                 }
            //             } else if (state === 2) {
            //                 if (index !== -1) {
            //                     temp_arr.splice(index, 1);
            //                 } else {
            //                     console.log('不存在111');
            //                     return res.send({
            //                         data: false,
            //                         status: 200
            //                     });
            //                 }
            //             }
            //             var data = temp_arr.join(",");
            //         }
            //         var codeSql = 'UPDATE manykit_user SET mymaterial = ? WHERE id = ?';
            //         var codeParams = [data, userid];
            //         query(codeSql, codeParams, function(err, result) {
            //             if (err) {
            //                 console.log('[ERROR] - ', err.message);
            //             } else {
            //                 var codeSql = 'SELECT collectUser FROM manykit_resourcemall  WHERE `id` = ? ';
            //                 var codeParams = [id];
            //                 query(codeSql, codeParams, function(err, result) {
            //                     if (err) {
            //                         console.log('[ERROR] - ', err.message);
            //                     } else {
            //                         if (result.length !== 0) {
            //                             var data = JSON.parse(JSON.stringify(result));
            //                             if (data[0].collectUser) {
            //                                 var temp_arr = data[0].collectUser.split(',');
            //                             } else {
            //                                 var temp_arr = [];
            //                             }
            //                             if (state === 1) {
            //                                 temp_arr.push(userid);
            //                             } else {
            //                                 var struserid = userid.toString();
            //                                 var index = temp_arr.indexOf(struserid);
            //                                 if (index !== -1) {
            //                                     temp_arr.splice(index, 1);
            //                                 } else {
            //                                     console.log('不存在222');
            //                                     return res.send({
            //                                         data: false,
            //                                         status: 200
            //                                     })
            //                                 }
            //                             }
            //                             var temp_length = temp_arr.length;
            //                             var temp_str = temp_arr.join(",");
            //                         }
            //                         var codeSql = 'UPDATE manykit_resourcemall SET collectUser = ?,collectTotal = ? WHERE id = ?';
            //                         var codeParams = [temp_str, temp_length, id];
            //                         query(codeSql, codeParams, function(err, result) {
            //                             if (err) {
            //                                 console.log('[ERROR] - ', err.message);
            //                             } else {
            //                                 res.send({
            //                                     data: true,
            //                                     status: 200
            //                                 })
            //                             }
            //                         })
            //                     }
            //                 })
            //             }
            //         })
            //     } else {
            //         res.send({
            //             errmsg: '不存在该用户',
            //             status: 200
            //         })
            //     }
            // })
            let codeSql = 'SELECT collectTotal FROM manykit_resourcemall  WHERE `id` = ? ';
            let codeParams = [id];
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    let collectTotal = parseInt(result[0].collectTotal) + 1;
                    let codeSql = 'UPDATE manykit_resourcemall SET collectTotal = ? WHERE id = ?';
                    let codeParams = [collectTotal, id];
                    publicSql(codeSql, codeParams).then((result) => {
                        responseResult.success(res)
                    }).catch((err) => {
                        return next(err);
                    })
                } else {
                    return responseResult.error(res, '不存在该作品')
                }
            }).catch((err) => {
                return next(err);
            })
        },
        uploadresource(req, res, next) {
            var onenav = req.body.onenav;
            var twonav = req.body.twonav;
            var threenav = req.body.threenav;
            var fournav = req.body.fournav;
            for (var i = 0; i < req.files.length; i++) {
                //文件名
                var fileOriginalname = req.files[i].originalname;
                var index = fileOriginalname.lastIndexOf(".");
                var name = fileOriginalname.substring(0, index);
                var type = fileOriginalname.substr(index + 1);
                //后缀名所对应的MIME类型 
                var fileMimetype = req.files[i].mimetype;
                //二进制文件
                var fileBuffer = req.files[i].buffer;
                var codeSql = "INSERT INTO `manykit_resourcemall` SET `name`=?,`type`=?,`content` = ?,`onenav`=?, `twonav`=?,`threenav`=?, `fournav`=?";
                var codeParams = [name, type, fileBuffer, onenav, twonav, threenav, fournav];
                query(codeSql, codeParams, function(err, result) {
                    if (err) {
                        console.log('[INSERT ERROR] - ', err.message);
                    } else {
                        res.send({
                            data: true,
                            status: 200
                        })
                    }
                })

            }
        }

    },
    toycar: {
        //玩具车的操作
        project(req, res, next) {
            var id = req.body.id;
            var userid = req.body.userid;
            var title = req.body.title ? req.body.title : 'null';
            var p_desc = req.body.p_desc ? req.body.p_desc : 'null';
            //state 1 新增 2编辑 3 发布 4 回收站 5 删除 6还原到未发布状态 7 新增小车 8 编辑小车 9 保存小车 10删除小车
            var state = req.body.state ? req.body.state : 1;
            //项目内容
            var content = req.body.content;
            //项目类型 1 Mini车 2 履带车
            var projecttype = req.body.projecttype ? req.body.projecttype : 1;
            // if (!id) {
            //     res.send({
            //         msg: '请先登录后进行操作',
            //         status: 200
            //     });
            //     return false;
            // }
            if (state === 1) {
                // 初始化
                var str = '<project type="batcar" name="' + title + '" desc="' + p_desc + '" auth="' + userid + '" icondata=""><car name="car" desc="this is a car" maxhp="100" dp="10" maxspeed="" icondata=""><skill name="skill0" desc="this is a skill" cd="15" preparetime="1" preparesound="" activatesound=""><buf name="buf" des="this is a buf" layertag="1" layertagtype="0" sidetype="0" lasttime="0" maxhp="10" hp="10" cd="2" ap="5" dp="10" speed="3" hitminus="0.5" stunk="true"/></skill></car></project>';
                var buf = Buffer.from(str);
                var codeSql = "INSERT INTO `manykit_usertoycar` SET `userid`=?,`title`=?, `p_desc`=?, `projecttype`=?,`content` = ?";
                var codeParams = [userid, title, p_desc, projecttype, buf];
            } else if (state === 2) {
                if (content) {
                    var codeSql = "UPDATE `manykit_usertoycar` SET `title`=?, `p_desc`=?,`content` = ? WHERE id = ?";
                    var codeParams = [title, p_desc, content, id];
                } else {
                    var codeSql = "UPDATE `manykit_usertoycar` SET `title`=?, `p_desc`=? WHERE id = ?";
                    var codeParams = [title, p_desc, id];
                }
            } else if (state === 3) {
                var codeSql = "UPDATE `manykit_usertoycar` SET `state`=? WHERE id = ?";
                var codeParams = [1, id];
            } else if (state === 4) {
                var codeSql = "UPDATE `manykit_usertoycar` SET `state`=? WHERE id = ?";
                var codeParams = [2, id];
            } else if (state === 5) {
                var codeSql = "DELETE FROM `manykit_usertoycar` WHERE id = ?";
                var codeParams = [id];
            } else if (state === 6) {
                var codeSql = "UPDATE `manykit_usertoycar` SET `state`=? WHERE id = ?";
                var codeParams = [0, id];
            } else if (state === 7 || state === 8 || state === 9 || state === 10 || state === 11) {
                var codeSql = "SELECT id,content FROM manykit_usertoycar WHERE id=?";
                var codeParams = [id];
            }
            query(codeSql, codeParams, function(err, result) {
                if (err) {
                    console.log('[ERROR] - ', err.message);
                } else {
                    if (state === 11) {
                        var projectInfo = req.body.projectInfo;
                        var content = result[0].content;
                        var data = content.toString('UTF-8', 0, content.length);
                        var startIndex = data.indexOf("<car");
                        var data_arr = [];
                        data_arr.push(data.substring(0, startIndex));
                        data_arr.push(data.substring(startIndex, data.length));
                        data_arr[0] = projectInfo;
                        var project = data_arr.join("");
                        var codeSql = "UPDATE `manykit_usertoycar` SET `title`=?, `p_desc`=?,`content`=? WHERE id = ?";
                        var codeParams = [title, p_desc, project, id];
                        query(codeSql, codeParams, function(err, result) {
                            if (err) {
                                console.log('[UPDATE ERROR] - ', err.message);
                            } else {
                                res.send({
                                    data: true,
                                    status: 200
                                })
                            }
                        })
                    } else if (state === 7) {
                        var content = result[0].content;
                        var data = content.toString('UTF-8', 0, content.length);
                        var newcar = "<car name='car' desc='this is a car' maxhp='100' dp='10' maxspeed='' icondata=''><skill name='skill0' desc='this is a skill' cd='15' preparetime='1' preparesound='' activatesound=''><buf name='buf' des='this is a buf' layertag='1' layertagtype='0' sidetype='0' lasttime='0' maxhp='10' hp='10' cd='2' ap='5' dp='10' speed='3' hitminus='0.5' stunk='true'/></skill></car></project>";
                        var data_arr = data.split("</project>");
                        data_arr.splice(data_arr.length - 1, 1, newcar);
                        var data_str = data_arr.join("");
                        var carbuf = Buffer.from(data_str);
                        var carConfig = '<car name="car" desc="this is a car" maxhp="100" dp="10" maxspeed="" icondata=""><skill name="skill0" desc="this is a skill" cd="15" preparetime="1" preparesound="" activatesound=""><buf name="buf" des="this is a buf" layertag="1" layertagtype="0" sidetype="0" lasttime="0" maxhp="10" hp="10" cd="2" ap="5" dp="10" speed="3" hitminus="0.5" stunk="true"/></skill></car>';
                        var codeSql = "UPDATE `manykit_usertoycar` SET `content`=? WHERE id = ?";
                        var codeParams = [carbuf, id];
                        query(codeSql, codeParams, function(err, result) {
                                if (err) {
                                    console.log('[UPDATE ERROR] - ', err.message);
                                } else {
                                    res.send({
                                        data: carConfig,
                                        status: 200
                                    })
                                }
                            })
                            //转化为json
                            // parseString(buf, function(err, result) {
                            //     if (err) {
                            //         console.log(err);
                            //     } else {
                            //         var newcar = "<car name='car' desc='this is a car' maxhp='100' dp='10' maxspeed='' icondata=''><skill name='skill0' desc='this is a skill' cd='15' preparetime='1' preparesound='' activatesound=''><buf name='buf' des='this is a buf' layertag='1' layertagtype='0' sidetype='0' lasttime='0' maxhp='10' hp='10' cd='2' ap='5' dp='10' speed='3' hitminus='0.5' stunk='true'/></skill></car></project>";
                        //         var data = JSON.stringify(result);
                        //         var data_arr = data.split("</project>");
                        //         var data_arr = data_arr.splice(data_arr.length-1,1,newcar);
                        //         var data_str = data_arr.join("");
                        //         console.log(data_str);
                        //         var carbuf = Buffer.from(data_str);
                        //         console.log(carbuf);
                        //         // data.project.car.push(newcar);
                        //         // for(var k in data) {
                        //         //     // console.log(k+':'+data[k])
                        //         // }
                        //         // console.log("====");
                        //         // console.log(data.project.car);
                        //         // console.log("====");
                        //         // console.dir(data.project.car[0]);
                        //         // var builder = new xml2js.Builder();
                        //         // var jsonxml = builder.buildObject(newcar);
                        //         // console.log(jsonxml);
                        //     }
                        // });

                    } else if (state === 8) {
                        var content = result[0].content;
                        var carIndex = req.body.carIndex;
                        var data = content.toString('UTF-8', 0, content.length);
                        var startIndex = data.indexOf("<car");
                        var endIndex = data.lastIndexOf("</project>");
                        var data_arr = [];
                        data_arr.push(data.substring(0, startIndex));
                        data_arr.push(data.substring(startIndex, endIndex));
                        data_arr.push(data.substring(endIndex, data.length));
                        var car_list = data_arr[1];
                        var car_arr = car_list.split("</car>");
                        var singleCar = car_arr[carIndex];
                        var singleCar = [singleCar, "</car>"].join("");
                        // var CarBuf = Buffer.from(singleCar);
                        res.send({
                            data: {
                                car: singleCar,
                            },
                            status: 200
                        })
                    } else if (state === 9) {
                        var content = result[0].content;
                        var carIndex = req.body.carIndex;
                        var data = content.toString('UTF-8', 0, content.length);
                        var startIndex = data.indexOf("<car");
                        var endIndex = data.lastIndexOf("</project>");
                        var data_arr = [];
                        data_arr.push(data.substring(0, startIndex));
                        data_arr.push(data.substring(startIndex, endIndex));
                        data_arr.push(data.substring(endIndex, data.length));
                        var car_list = data_arr[1];
                        var car_arr = car_list.split("</car>");
                        car_arr.splice(car_arr.length - 1, 1);
                        // var fileBuffer = req.files[0].buffer;
                        // var file = fileBuffer.toString('UTF-8', 0, fileBuffer.length);
                        var file = req.body.content;
                        var file = file.split("</car>")[0];
                        car_arr[carIndex] = file;

                        for (let k = 0; k < car_arr.length; k++) {
                            var temp_arr = [car_arr[k], "</car>"];
                            let temp_str = temp_arr.join("");
                            car_arr[k] = temp_str;
                        }
                        // car_arr[carIndex] = [car_arr[carIndex], "</car>"].join("");
                        var car_arr = car_arr.join("");
                        data_arr[1] = car_arr;
                        var project = data_arr.join("");
                        var projectBuf = Buffer.from(project);

                        var codeSql = "UPDATE `manykit_usertoycar` SET `content`=? WHERE id = ?";
                        var codeParams = [projectBuf, id];
                        query(codeSql, codeParams, function(err, result) {
                            if (err) {
                                console.log('[UPDATE ERROR] - ', err.message);
                            } else {
                                res.send({
                                    data: true,
                                    status: 200
                                })
                            }
                        })

                    } else if (state === 10) {
                        let carId = req.body.carId;
                        var content = result[0].content;
                        var data = content.toString('UTF-8', 0, content.length);
                        var startIndex = data.indexOf("<car");
                        var endIndex = data.lastIndexOf("</project>");
                        var data_arr = [];
                        data_arr.push(data.substring(0, startIndex));
                        data_arr.push(data.substring(startIndex, endIndex));
                        data_arr.push(data.substring(endIndex, data.length));
                        var car_list = data_arr[1];
                        // var car_length = car_list.length;
                        // if(car_length<2) {
                        //     res.send({
                        //     })
                        // }
                        var car_arr = car_list.split("</car>");
                        car_arr.splice(car_arr.length - 1, 1);
                        car_arr.splice(carId, 1);
                        for (let i = 0; i < car_arr.length; i++) {
                            car_arr[i] = [car_arr[i], "</car>"].join("");
                        };
                        data_arr[1] = car_arr.join("");
                        var data_str = data_arr.join("");
                        var carbuf = Buffer.from(data_str);
                        var codeSql = "UPDATE `manykit_usertoycar` SET `content`=? WHERE id = ?";
                        var codeParams = [carbuf, id];
                        query(codeSql, codeParams, function(err, result) {
                            if (err) {
                                console.log('[UPDATE ERROR] - ', err.message);
                            } else {
                                res.send({
                                    data: true,
                                    status: 200
                                })
                            }
                        })
                    } else {
                        res.send({
                            data: true,
                            status: 200
                        })
                    }

                }
            })
        },
        //玩具车列表
        projectList(req, res, next) {
            var userid = req.body.userid;
            //文件类型
            var projecttype = req.body.projecttype;
            var pagenum = parseInt(req.body.pagenum ? req.body.pagenum : 1);
            var pagesize = parseInt(req.body.pagesize ? req.body.pagesize : 15);
            var start = (pagenum - 1) * pagesize;
            if (typeof(userid) === 'undefined') {
                res.send({
                    errmsg: '在编程玩登录后才能保存自己的项目哦',
                    status: 200
                })
                return;
            } else {
                if (projecttype === 0) {
                    var codeSql = 'SELECT id,title,p_desc,create_time,(SELECT count(1) FROM manykit_usertoycar WHERE userid = ?) as total FROM manykit_usertoycar WHERE `userid` = ? limit ?, ?';
                    var codeParams = [userid, userid, start, pagesize];
                } else if(projecttype === 1){
                    var codeSql = 'DELETE  FROM manykit_usertoycar WHERE `id` = ?';
                    var codeParams = [userid, projecttype, userid, projecttype, start, pagesize];
                } else {
                    var codeSql = 'SELECT id,title,p_desc,create_time,(SELECT count(1) FROM manykit_usertoycar WHERE userid = ? AND `projecttype` = ?) as total FROM manykit_usertoycar WHERE `userid` = ? AND `projecttype` = ? limit ?, ?';
                    var codeParams = [userid, projecttype, userid, projecttype, start, pagesize];
                }
            }
            query(codeSql, codeParams, function(err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);

                } else if (result.length !== 0) {
                    var data = JSON.parse(JSON.stringify(result));
                    var total = data.length ? data[0].total : 0;
                    res.send({
                        data: data,
                        pagenum: pagenum,
                        pagesize: pagesize,
                        total: total,
                        status: 200
                    })
                } else {
                    res.send({
                        data: {
                            msg: '这回真的没有了~'
                        },
                        status: 200
                    })
                }
            })

        },
        //获取玩具车项目信息
        getproject(req, res, next) {
            var id = req.body.id;
            var searchSql = 'SELECT * FROM manykit_usertoycar WHERE `id` = ?';
            var searchParams = [id];
            query(searchSql, searchParams, function(err, result) {
                // console.log(JSON.stringify(result));
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                } else if (result.length !== 0) {
                    var title = result[0].title;
                    var desc = result[0].desc;
                    var content = result[0].content;
                    // var buf = new Buffer(content, 'base64');
                    if (content) {
                        var buf = content.toString('UTF-8', 0, content.length);
                    } else {
                        var buf = "";
                    }
                    var writeStream = fs.createWriteStream(title);
                    writeStream.write(buf, 'UTF-8');
                    writeStream.end();
                    writeStream.on('finish', function() {
                        res.sendfile(title);
                    });
                    writeStream.on('error', function(err) {
                        console.log(err.stack);
                    })

                }
            })
        }

    },
    tool: {
        mdToHtml(req, res, next) {
            // let filePath = req.files[0].path;
            // let fileOriginalname = req.files[0].originalname;
            // let body = req.files[0].buffer;
            // body = body.toString('UTF-8', 0, body.length);
            // let html = marked(body);
            // let mdName = 'market/md/' + fileOriginalname;
            // let htmlName = 'market/html/'+ fileOriginalname.split(".")[0] + ".html";
            // fs.createWriteStream(mdName).end(body);
            // fs.createWriteStream(htmlName).end(html);
            // responseResult.success(res)
            res.send({
                data: req.file
            });
        }
    },
    music: {
        list(req, res, next) {
            let requestConfig = {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            }
            let url = 'http://mobilecdn.kugou.com/api/v3/rank/song?rankid=8888&pagesize=500&ranktype=2&page=1';
            async function get(url) {
                const data = await fetch(url);
                const json = await data.json();
                return json;
            };
            get(url).then((data) => {
                let lists = data.data.info;
                let resData = Array.from(lists, (list) => {
                    let {
                        filename, //歌手+歌曲名
                        remark, //歌曲名
                        hash, //歌曲hash值
                        duration //时长
                    } = list;
                    return {
                        songName: remark,
                        fileName: filename,
                        hash: hash,
                        duration: duration
                    };
                })
                return responseResult.success(res, resData);
            }).catch((err) => {
                next(err)
            })

        },
        search(req, res, next) {
            let word = req.query.word;
            let encode = encodeURI(word);
            let page = req.query.page ? req.query.page : 1;
            let pagesize = req.query.pagesize ? req.query.pagesize : 20;
            let url = `http://songsearch.kugou.com/song_search_v2?keyword=${encode}&page=${page}&pagesize=${pagesize}`;
            async function get(url) {
                const data = await fetch(url);
                const json = await data.json();
                return json;
            };
            get(url).then((data) => {
                let lists = data.data.lists;
                let resData = Array.from(lists, (list) => {
                    let {
                        SongName, //歌曲名
                        SingerName, //歌手名
                        FileHash, //歌曲hash值
                        FileName, //歌手+歌曲名
                        Duration //时长
                    } = list;
                    return {
                        songName: SongName,
                        singerName: SingerName,
                        hash: FileHash,
                        fileName: FileName,
                        duration: Duration
                    };
                })
                return responseResult.success(res, resData);
            }).catch((err) => {
                next(err)
            })
        },
        song(req, res, next) {
            let hash = req.query.hash;
            let url = `http://www.kugou.com/yy/index.php?r=play/getdata&hash=${hash}`;
            async function get(url) {
                const data = await fetch(url);
                const json = await data.json();
                return json;
            };
            get(url).then((data) => {
                let list = data.data;
                let {
                    song_name, //歌曲名
                    author_name, //歌手名
                    audio_name, //歌手+歌曲名
                    timelength, //时长
                    play_url, //地址
                    lyrics //歌词
                } = list;
                let resData = {
                    songName: song_name,
                    singerName: author_name,
                    sileName: audio_name,
                    duration: parseInt(timelength / 1000),
                    url: play_url,
                    lyrics: lyrics
                };

                return responseResult.success(res, resData);
            }).catch((err) => {
                next(err)
            })
        }
    },
    material: {
        userinfo(req, res, next) {
            let userid = parseInt(req.body.userid);
            if (tool.ArrIsEmpty([userid])) {
                return responseResult.error(res, '信息不完整');
            }
            //修改个人信息 1 修改个人基本信息 
            let state = parseInt(req.body.state);
            //1 获取个人基本信息 2获取个人详细信息 3 我收藏的作品 4 我关注的人 5 关注我的人 6 获取个人全部作品
            let getinfostate = parseInt(req.body.getinfostate);
            let pagenum = req.body.pagenum ? parseInt(req.body.pagenum) : 1;
            let pagesize = req.body.pagesize ? parseInt(req.body.pagesize) : 15;
            let start = (pagenum - 1) * pagesize;
            let imgBuffer,
                aboutme,
                tags,
                codeSql,
                codeParams;

            if (state === 1) {
                aboutme = req.body.aboutme;
                let headportrait = req.body.headportrait;
                // let imgBuffer = req.files[0].buffer;
                if (!headportrait) {
                    let temp_path = req.files[0].path;
                    let headportrait = temp_path.replace(/file/, "/static");
                    let temp_tagarr = req.body.tags.split(",")
                    let mytags = JSON.stringify(temp_tagarr);
                    codeSql = 'UPDATE manykit_user SET aboutme = ?,mytags = ?,headportrait=? WHERE id = ?';
                    codeParams = [aboutme, mytags, headportrait, userid];
                } else {
                    let mytags = JSON.stringify(req.body.tags);
                    codeSql = 'UPDATE manykit_user SET aboutme = ?,mytags = ? WHERE id = ?';
                    codeParams = [aboutme, mytags, userid];
                }
            } else if (getinfostate === 6) {
                codeSql = 'SELECT id,type,title,modelimg,state,userid FROM manykit_userresource  WHERE `userid` = ? AND (`state` = 1 OR `state` = 0)';
                codeParams = [userid];
            } else {
                codeSql = 'SELECT id,username,headportrait,aboutme,mytags,mycollect3D,myattention3D,attentionme3D FROM manykit_user  WHERE `id` = ? ';
                codeParams = [userid];
            }
            publicSql(codeSql, codeParams).then((result) => {
                let data = JSON.parse(JSON.stringify(result))[0];
                if (state === 1) {
                    responseResult.success(res)
                } else {
                    if (getinfostate === 1) {
                        let tags = JSON.parse(data.mytags);
                        let resData = {
                            userid: data.id,
                            username: data.username,
                            aboutme: data.aboutme,
                            headportrait: data.headportrait,
                            tags: tags
                        }
                        responseResult.success(res, resData)
                    } else if (getinfostate === 2) {
                        let codeSql = 'SELECT id,type,title,modelimg,state,userid FROM manykit_userresource  WHERE `userid` = ? AND (`state` = 1 OR `state` = 0)';
                        let codeParams = [userid];
                        publicSql(codeSql, codeParams).then((result) => {
                            let data1 = JSON.parse(JSON.stringify(result));
                            let auth_token = req.signedCookies['xuduomi'];
                            let localuserid;
                            if (auth_token) {
                                localuserid = auth_token.split('$$$$')[1];
                                if (data.attentionme3D) {
                                    let status = JSON.parse(data.attentionme3D).findIndex((value) => value == localuserid);
                                    if (status !== -1) {
                                        data.isAttention = true
                                    }
                                } else {
                                    data.isAttention = false
                                }
                            } else {
                                data.isAttention = false
                            }
                            data.mycollect3D = data.mycollect3D ? JSON.parse(data.mycollect3D).length : 0;
                            data.attentionme3D = data.attentionme3D ? JSON.parse(data.attentionme3D).length : 0;
                            data.myattention3D = data.myattention3D ? JSON.parse(data.myattention3D).length : 0;
                            data.mytags = data.mytags ? JSON.parse(data.mytags) : [];
                            let resData = {
                                user: data,
                                data: data1
                            }
                            responseResult.success(res, resData)
                        }).catch((err) => {
                            return next(err);
                        })
                    } else if (getinfostate === 3) {
                        if (data.mycollect3D) {
                            let temp_col1 = JSON.parse(data.mycollect3D);
                            let temp_col2 = "'" + temp_col1.join(",") + "'";
                            let codeSql = `select b.id, b.title,b.type,b.state,b.userid,b.modelimg from manykit_userresource b where 1 = 1 and exists (select 1 from manykit_user a where FIND_IN_SET(b.id,${temp_col2})and a.id = ?)`;
                            let codeParams = [userid];
                            publicSql(codeSql, codeParams).then((result) => {
                                let temp_mycollect = JSON.parse(JSON.stringify(result));
                                let temp_arr1 = Array.from(temp_mycollect, (list) => {
                                    return list.userid
                                })
                                let temp_str1 = temp_arr1.join(",");
                                let codeSql = 'SELECT id,username FROM manykit_user WHERE find_in_set(id,?)';
                                let codeParams = [temp_str1];
                                publicSql(codeSql, codeParams).then((result) => {
                                    let data1 = JSON.parse(JSON.stringify(result));
                                    let temp_auth = {};
                                    for (let i = 0; i < data1.length; i++) {
                                        temp_auth[data1[i].id] = data1[i].username;
                                    }
                                    for (let j = 0; j < temp_mycollect.length; j++) {
                                        temp_mycollect[j].auth = temp_auth[temp_mycollect[j].userid]
                                    }
                                    responseResult.success(res, temp_mycollect)
                                }).catch((err) => {
                                    return next(err);
                                })
                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
                            responseResult.error(res)
                        }
                    } else if (getinfostate === 4) {
                        if (data.myattention3D) {
                            let myattention3D = JSON.parse(data.myattention3D).join(',');
                            let codeSql = 'SELECT id,username,headportrait FROM manykit_user WHERE find_in_set(id,?) limit ?,?';
                            let codeParams = [myattention3D, start, pagesize];
                            publicSql(codeSql, codeParams).then((result) => {
                                let data = JSON.parse(JSON.stringify(result));
                                responseResult.success(res, data)
                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
                            responseResult.error(res)
                        }
                    } else if (getinfostate === 5) {
                        if (data.attentionme3D) {
                            let attentionme3D = JSON.parse(data.attentionme3D).join(',');
                            let codeSql = 'SELECT id,username,headportrait FROM manykit_user  WHERE find_in_set(id,?) limit ?,?';
                            let codeParams = [attentionme3D, start, pagesize];
                            publicSql(codeSql, codeParams).then((result) => {
                                let data = JSON.parse(JSON.stringify(result));
                                responseResult.success(res, data)
                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
                            responseResult.error(res)
                        }
                    } else if (getinfostate === 6) {
                        let resData = {
                            data: JSON.parse(JSON.stringify(result)),
                        }
                        responseResult.success(res, resData)
                    }
                }
            }).catch((err) => {
                return next(err);
            })
        },
        useropreate(req, res, next) {
            //1收藏 2 取消收藏3 点赞 4 取消点赞 5 关注 6 取消关注 7 发布
            let state = parseInt(req.body.state);
            let userid = parseInt(req.body.userid);
            if (tool.ArrIsEmpty([userid, state])) {
                return responseResult.error(res, '信息不完整');
            }
            if (state === 1 || state === 2) {
                let id = req.body.id;
                let codeSql = 'SELECT mycollect3D FROM manykit_user  WHERE `id` = ? ';
                let codeParams = [userid];
                publicSql(codeSql, codeParams).then((result) => {
                    let data;
                    if (result.length !== 0) {
                        data = JSON.parse(JSON.stringify(result));
                        let temp_arr;
                        if (data[0].mycollect3D) {
                            temp_arr = JSON.parse(data[0].mycollect3D)
                        } else {
                            temp_arr = [];
                        }
                        let index = temp_arr.findIndex((value) => value == id);
                        if (state === 1) {
                            if (index === -1) {
                                temp_arr.push(id);
                            } else {
                                return responseResult.error(res, '不要重复收藏哟!');
                            }
                        } else {
                            if (index === -1) {
                                return responseResult.error(res, '收藏后才可以取消收藏哟!');
                            } else {
                                temp_arr.splice(index, 1);
                            }
                        }
                        data = JSON.stringify(temp_arr);
                    } else {
                        data = JSON.stringify([id]);
                    }
                    let codeSql = 'UPDATE manykit_user SET mycollect3D = ? WHERE id = ?';
                    let codeParams = [data, userid];
                    publicSql(codeSql, codeParams).then((result) => {
                        let codeSql = 'SELECT collect FROM manykit_userresource  WHERE `id` = ? ';
                        let codeParams = [id];
                        publicSql(codeSql, codeParams).then((result) => {
                            let temp_str,
                                temp_length;
                            if (result.length !== 0) {
                                let temp_arr;
                                let data = JSON.parse(JSON.stringify(result));
                                if (data[0].collect) {
                                    temp_arr = JSON.parse(data[0].collect);
                                } else {
                                    temp_arr = [];
                                }
                                let index = temp_arr.findIndex((value) => value == userid);
                                if (state === 1) {
                                    if (index == -1) {
                                        temp_arr.push(userid);
                                    }
                                } else {
                                    if (index !== -1) {
                                        temp_arr.splice(index, 1);
                                    }
                                }
                                temp_length = temp_arr.length;
                                temp_str = JSON.stringify(temp_arr);
                            } else {
                                temp_str = JSON.stringify([userid]);
                                temp_length = 1;
                            }
                            let codeSql = 'UPDATE manykit_userresource SET collect = ?,collecttotal = ? WHERE id = ?';
                            let codeParams = [temp_str, temp_length, id];
                            publicSql(codeSql, codeParams).then((result) => {
                                responseResult.success(res)
                            }).catch((err) => {
                                return next(err);
                            })
                        }).catch((err) => {
                            return next(err);
                        })
                    }).catch((err) => {
                        return next(err);
                    })
                }).catch((err) => {
                    return next(err);
                })
            } else if (state === 3 || state === 4) {
                let id = req.body.id;
                let codeSql = 'SELECT praise FROM manykit_userresource  WHERE `id` = ? ';
                let codeParams = [id];
                publicSql(codeSql, codeParams).then((result) => {
                    let temp_str,
                        temp_length;
                    if (result.length !== 0) {
                        let temp_arr;
                        let data = JSON.parse(JSON.stringify(result));
                        if (data[0].praise) {
                            temp_arr = JSON.parse(data[0].praise);
                        } else {
                            temp_arr = [];
                        }
                        let index = temp_arr.findIndex((value) => value == userid)
                        if (state === 3) {
                            if (index !== -1) {
                                return responseResult.error(res, '不要重复点赞哟!');
                            } else {
                                temp_arr.push(userid);
                            }
                        } else {
                            if (index !== -1) {
                                temp_arr.splice(index, 1);
                            } else {
                                return responseResult.error(res, '点赞后才可以取消点赞哟!');
                            }
                        }
                        temp_length = temp_arr.length;
                        temp_str = JSON.stringify(temp_arr);
                    } else {
                        temp_str = JSON.stringify([id]);
                        temp_length = 1;
                    }
                    let codeSql = 'UPDATE manykit_userresource SET praise = ?,praisetotal = ? WHERE id = ?';
                    let codeParams = [temp_str, temp_length, id];
                    publicSql(codeSql, codeParams).then((result) => {
                        responseResult.success(res)
                    }).catch((err) => {
                        return next(err);
                    })
                }).catch((err) => {
                    return next(err);
                })
            } else if (state === 5 || state === 6) {
                let attentionid = parseInt(req.body.attentionid);
                let codeSql = 'SELECT myattention3D FROM manykit_user  WHERE `id` = ? ';
                let codeParams = [userid];
                publicSql(codeSql, codeParams).then((result) => {
                    let data;
                    if (result.length !== 0) {
                        let temp_arr;
                        data = JSON.parse(JSON.stringify(result));
                        if (data[0].myattention3D) {
                            temp_arr = JSON.parse(data[0].myattention3D);
                        } else {
                            temp_arr = [];
                        }
                        let index = temp_arr.findIndex((value) => value == attentionid);
                        if (state === 5) {
                            if (index !== -1) {
                                return responseResult.error(res, '不要重复关注哟!');
                            } else {
                                temp_arr.push(attentionid);
                            }
                        } else {
                            if (index !== -1) {
                                temp_arr.splice(index, 1);
                            } else {
                                return responseResult.error(res, '关注后才能取消关注哟!');
                            }
                        }
                        data = JSON.stringify(temp_arr);
                    } else {
                        data = JSON.stringify([attentionid]);
                    }
                    let codeSql = 'UPDATE manykit_user SET myattention3D = ? WHERE id = ?';
                    let codeParams = [data, userid];
                    publicSql(codeSql, codeParams).then((result) => {
                        let codeSql = 'SELECT attentionme3D FROM manykit_user  WHERE `id` = ? ';
                        let codeParams = [attentionid];
                        publicSql(codeSql, codeParams).then((result) => {
                            let data;
                            if (result.length !== 0) {
                                let temp_arr;
                                data = JSON.parse(JSON.stringify(result));
                                if (data[0].attentionme3D) {
                                    temp_arr = JSON.parse(data[0].attentionme3D);
                                } else {
                                    temp_arr = [];
                                }
                                let index = temp_arr.findIndex((value) => value == userid);
                                if (state === 5) {
                                    if (index == -1) {
                                        temp_arr.push(userid);
                                    }
                                } else {
                                    if (index !== -1) {
                                        temp_arr.splice(index, 1);
                                    }
                                }
                                data = JSON.stringify(temp_arr);
                            } else {
                                data = JSON.stringify([userid]);
                            }
                            let codeSql = 'UPDATE manykit_user SET attentionme3D = ? WHERE id = ?';
                            let codeParams = [data, attentionid];
                            publicSql(codeSql, codeParams).then((result) => {
                                responseResult.success(res)
                            }).catch((err) => {
                                return next(err);
                            })
                        }).catch((err) => {
                            return next(err);
                        })
                    }).catch((err) => {
                        return next(err);
                    })
                }).catch((err) => {
                    return next(err);
                })
            } else if (state === 7) {
                let id = req.body.id;
                let publish_time = tool.localtime();
                let codeSql = "UPDATE `manykit_userresource` SET `state`=?,`publish_time`=? WHERE id = ?";
                let codeParams = [1, publish_time, id];
                publicSql(codeSql, codeParams).then((result) => {
                    return responseResult.success(res)
                }).catch((err) => {
                    return next(err);
                })
            }

        },
        uploadHeadPortrait(req, res, next) {
            //1 上传头像 2 上传封面图
            let state = parseInt(req.body.state),
                codeSql,
                codeParams;
            if (tool.ArrIsEmpty([state])) {
                return responseResult.error(res, '信息不完整');
            }
            if (state === 1) {
                let userid = parseInt(req.body.userid);
                let imgBuffer = req.files[0].buffer;
                codeSql = "UPDATE `manykit_user` SET `imgBuffer`=? WHERE id = ?";
                codeParams = [imgBuffer, userid];
            } else if (state === 2) {
                let id = parseInt(req.body.id);
                let imgBuffer = req.files[0].buffer;
                let random_name = uuid.v1();
                let random_index = tool.randomString(6);
                let filename = `${random_name}${random_index}.png`;
                let modelsrc = `/static/images/${filename}`;
                // 创建一个可以写入的流，写入到文件 output.txt 中
                let writerStream = fs.createWriteStream(`./file/images/${filename}`);
                // 使用 utf8 编码写入数据
                writerStream.write(imgBuffer, 'UTF8');
                // 标记文件末尾
                writerStream.end();
                codeSql = "UPDATE `manykit_userresource` SET `modelimg`=? WHERE id = ?";
                codeParams = [modelsrc, id];
            }
            publicSql(codeSql, codeParams).then((result) => {
                responseResult.success(res)
            }).catch((err) => {
                return next(err);
            })

        },
        uploadmaterial(req, res, next) {
            let id = parseInt(req.body.id);
            let userid = parseInt(req.body.userid);
            let title = req.body.title;
            let type = req.body.type;
            let filetype = req.body.filetype;
            //state 1 新增 2编辑 3 发布 4 回收站 5 删除
            let state = parseInt(req.body.state ? req.body.state : 1);
            if (tool.ArrIsEmpty([userid, title, type, filetype, state])) {
                return responseResult.error(res, '信息不完整');
            }
            let codeSql,
                codeParams,
                create_time;
            for (let i = 0; i < req.files.length; i++) {
                //文件名
                let fileOriginalname = req.files[i].originalname;
                //二进制文件
                let fileBuffer = req.files[i].buffer;
                if (state === 1) {
                    let temp_index = fileOriginalname.lastIndexOf(".");
                    let temp_mimetype = fileOriginalname.substr(temp_index + 1);
                    let random_name = uuid.v1();
                    let random_index = tool.randomString(6);
                    let filename = `${random_name}${random_index}.${temp_mimetype}`;
                    let modelsrc = `/static/model/${filename}`;
                    // 创建一个可以写入的流，写入到文件 output.txt 中
                    let writerStream = fs.createWriteStream(`./file/model/${filename}`);
                    // 使用 utf8 编码写入数据
                    writerStream.write(fileBuffer, 'UTF8');
                    // 标记文件末尾
                    writerStream.end();
                    create_time = tool.localtime();
                    codeSql = "INSERT INTO `manykit_userresource` SET `userid`=?,`name`=?,`title`=?,`modelsrc`=?,`mimetype`=?, `type`=?,`filetype`=?,`content` = ?,`create_time` = ?";
                    codeParams = [userid, filename, title, modelsrc, temp_mimetype, type, filetype, fileBuffer, create_time];

                } else if (state === 2) {
                    codeSql = "UPDATE `manykit_userresource` SET `name`=?,`title`=?,`type`=?,`filetype`=?, `desc`=?, WHERE id = ?";
                    codeParams = [fileOriginalname, title, type, filetype, desc, id];
                }
                publicSql(codeSql, codeParams).then((result) => {
                    if (state === 1) {
                        codeSql = "SELECT id FROM manykit_userresource WHERE userid = ? AND title = ? AND create_time = ?";
                        codeParams = [userid, title, create_time];
                        publicSql(codeSql, codeParams).then((result) => {
                            let projectid = JSON.parse(JSON.stringify(result))[0].id;
                            let resData = {
                                id: projectid
                            }
                            responseResult.success(res, resData)
                        }).catch((err) => {
                            return next(err);
                        })
                    } else {
                        responseResult.success(res)
                    }
                }).catch((err) => {
                    return next(err);
                })
            }
        },
        getmodule(req, res, next) {
            let id = req.body.id ? req.body.id : req.query.id;
            let userid = parseInt(req.body.userid);
            let state = parseInt(req.body.state);
            if (tool.ArrIsEmpty([id])) {
                return responseResult.error(res, '信息不完整');
            }
            //获取文件 1 获取文件发布数据 2 获取文件内容 3获取文件其他信息
            let type = parseInt(req.body.type);
            let headerReferer = req.headers.referer.split('/')[3];
            let codeSql,
                codeParams;
            if (type === 1) {
                codeSql = 'SELECT id,title,`modelsrc`,`mimetype`,`filetype`,`tags`,`desc` FROM manykit_userresource WHERE `id` = ? AND `state` = ?';
                codeParams = [id, state];
            } else if (type === 3) {
                codeSql = 'SELECT id,title,`modelsrc`,`mimetype`,`filetype`,`tags`,`desc`,praise,praisetotal,collect,collecttotal,looktotal,create_time,publish_time,recycle_time,userid FROM manykit_userresource WHERE `id` = ? AND `state` = ?';
                codeParams = [id, state];
            } else {
                codeSql = 'SELECT modelsrc,mimetype FROM manykit_userproject WHERE `id` = ?';
                codeParams = [id];
            }
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    if (type === 1) {
                        let resData = result[0];
                        responseResult.success(res, resData)
                    } else if (type === 3) {
                        let projectData = JSON.parse(JSON.stringify(result))[0];
                        let looktotal = parseInt(projectData.looktotal) + 1;
                        let desc = projectData.desc;
                        let praise = projectData.praise;
                        let collect = projectData.collect;
                        let isPraise,
                            isCollect;
                        if (praise && praise.indexOf(userid) !== -1) {
                            isPraise = true;
                        } else {
                            isPraise = false;
                        }
                        if (collect && collect.indexOf(userid) !== -1) {
                            isCollect = true;
                        } else {
                            isCollect = false;
                        }
                        let authid = parseInt(projectData.userid);
                        let codeSql = 'SELECT id,username,headportrait,attentionme3D FROM manykit_user WHERE `id` = ?';
                        let codeParams = [authid];
                        publicSql(codeSql, codeParams).then((result) => {
                            if (result.length !== 0) {
                                let userData = JSON.parse(JSON.stringify(result))[0];
                                let name,
                                    headportrait,
                                    attentionme,
                                    isAttention;
                                if (userData.id) {
                                    name = userData.username;
                                    headportrait = userData.headportrait;
                                    if (userData.attentionme3D) {
                                        attentionme = JSON.parse(userData.attentionme3D);
                                    } else {
                                        attentionme = [];
                                    }
                                }
                                if (attentionme.length !== 0 && attentionme.findIndex((value) => value == userid) !== -1) {
                                    isAttention = true;
                                } else {
                                    isAttention = false;
                                }
                                let codeSql = 'UPDATE manykit_userresource set looktotal = ? WHERE `id` = ?';
                                let codeParams = [looktotal, id];
                                publicSql(codeSql, codeParams).then((result) => {
                                    let resData = {
                                        id: id,
                                        modelsrc: projectData.modelsrc, //模型地址
                                        mimetype: projectData.mimetype, //模型类型
                                        title: projectData.title, //标题
                                        createtime: projectData.createtime, //时间
                                        publishtime: tool.formatDate(projectData.publish_time, true), //发布时间
                                        deletetime: projectData.recycle_time, //删除时间
                                        desc: desc, //作品描述
                                        looktotal: looktotal, //观看人数
                                        authid: authid, //作者id
                                        name: name, //作者名
                                        attentionme: attentionme.length, //粉丝
                                        headportrait: headportrait, //作者头像
                                        isAttention: isAttention, //是否关注
                                        praisetotal: projectData.praisetotal, //赞过的总人数
                                        collecttotal: projectData.collecttotal, //收藏的总人数
                                        isPraise: isPraise, //是否赞过
                                        isCollect: isCollect, //是否收藏
                                        filetype: projectData.filetype,
                                        tags: projectData.tags,

                                    }
                                    responseResult.success(res, resData)
                                }).catch((err) => {
                                    return next(err);
                                })
                            }
                        }).catch((err) => {
                            return next(err);
                        })
                    } else {
                        let content = result[0].content;
                        let buf = content.toString('UTF-8', 0, content.length);
                        let temp_name = './webs/zeronerobot/file/' + id + '.xml';
                        var writeStream = fs.createWriteStream(temp_name);
                        writeStream.write(buf, 'UTF-8');
                        writeStream.end();
                        writeStream.on('finish', function() {
                            res.sendfile(temp_name);
                        });
                        writeStream.on('error', function(err) {
                            console.log(err.stack);
                        })
                    }
                } else {
                    let data = {
                        data: {},
                        status: 200
                    }
                    responseResult.success(res, data)
                }
            }).catch((err) => {
                return next(err);
            })
        },
        dealmodule(req, res, next) {
            let id = req.body.id;
            let userid = req.body.userid;
            //state 0保存 1发布 2回收站 3删除 4还原到未发布状态
            let state = parseInt(req.body.state);
            if (tool.ArrIsEmpty([id, state])) {
                return responseResult.error(res, '信息不完整');
            }
            let codeSql,
                codeParams;
            // res.send({
            //     data:req.body
            // })
            if (state === 0) {
                let title = req.body.title;
                let filetype = req.body.filetype;
                let tags = req.body.tags;
                let desc = req.body.desc;
                let update_time = tool.localtime();
                codeSql = "UPDATE `manykit_userresource` SET `title`=?,`filetype`=?,`tags`=?,`desc`=?,`update_time`=? WHERE id = ?";
                codeParams = [title, filetype, tags, desc, update_time, id];

            } else if (state === 1) {
                let title = req.body.title;
                let filetype = req.body.filetype;
                let tags = req.body.tags;
                let desc = req.body.desc;
                let publish_time = tool.localtime();
                codeSql = "UPDATE `manykit_userresource` SET `state`=?,`title`=?,`filetype`=?,`tags`=?,`desc`=?,`publish_time`=? WHERE id = ?";
                codeParams = [1, title, filetype, tags, desc, publish_time, id];
            } else if (state === 2) {
                let recycle_time = tool.localtime();
                codeSql = "UPDATE `manykit_userresource` SET `state`=?,`recycle_time`=? WHERE id = ?";
                codeParams = [2, recycle_time, id];
            } else if (state === 3) {
                codeSql = "DELETE FROM `manykit_userresource` WHERE id = ?";
                codeParams = [id];
            } else if (state === 4) {
                codeSql = "UPDATE `manykit_userresource` SET `state`=? WHERE id = ?";
                codeParams = [0, id];
            }
            publicSql(codeSql, codeParams).then((result) => {
                responseResult.success(res)
            }).catch((err) => {
                return next(err);
            })
        },
        modulelist(req, res, next) {
            let userid = req.body.userid;
            //文件状态 0 未发布 1 已发布 2 删除
            let state = req.body.state;
            let type = req.body.type;
            //列表状态排序 1编辑推荐(收藏) 2 正在流行（点赞） 3 新鲜出炉(发布时间) 4搜索 5 类型筛选
            let sortstate = req.body.sortstate;
            let searchname = req.body.searchname;
            let temp_sort_arr = ['%', searchname, '%'];
            let temp_sort = temp_sort_arr.join('');
            let filter = req.body.filter;
            let filter_sort_arr = ['%', filter, '%'];
            let filter_sort = filter_sort_arr.join('');
            let pagenum = req.body.pagenum ? parseInt(req.body.pagenum) : 1;
            let pagesize = req.body.pagesize ? parseInt(req.body.pagesize) : 15;
            let codeSql,
                codeParams,
                auth;
            let start = (pagenum - 1) * pagesize;
            if (typeof(userid) === 'undefined') {
                codeSql = 'SELECT id,title,modelimg,userid FROM manykit_userresource  WHERE `state` = ? AND `type` = ? limit ?, ?';
                codeParams = [state, type, start, pagesize];
            }
            if (sortstate === 1) {
                codeSql = 'SELECT id,title,modelimg,userid FROM manykit_userresource  WHERE `state` = ? AND `type` = ? order by collecttotal desc limit ?, ?';
                codeParams = [1, type, start, pagesize];
            } else if (sortstate === 2) {
                codeSql = 'SELECT id,title,modelimg,userid FROM manykit_userresource  WHERE `state` = ? AND `type` = ? order by praisetotal desc limit ?, ?';
                codeParams = [1, type, start, pagesize];
            } else if (sortstate === 4) {
                codeSql = 'SELECT id,title,modelimg,userid FROM manykit_userresource  WHERE `state` = ? AND title like ? limit ?, ?';
                codeParams = [1, temp_sort, start, pagesize];
            } else if (sortstate === 3) {
                codeSql = 'SELECT id,title,modelimg,userid FROM manykit_userresource  WHERE `state` = ? AND `type` = ? order by publish_time desc limit ?, ?';
                codeParams = [1, type, start, pagesize];
            } else if (sortstate === 5) {
                codeSql = 'SELECT id,title,modelimg,userid FROM manykit_userresource  WHERE `state` = ? AND `type` = ? AND filetype like ? limit ?, ?';
                codeParams = [1, type, filter_sort, start, pagesize];
            }
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    let data = JSON.parse(JSON.stringify(result));
                    let temp_arr1 = Array.from(data, (list) => {
                        return list.userid
                    })
                    temp_arr1 = Array.from(new Set(temp_arr1));
                    let temp_str1 = temp_arr1.join(",");
                    let codeSql = 'SELECT id,username,headportrait FROM manykit_user WHERE find_in_set(id,?)';
                    let codeParams = [temp_str1];
                    publicSql(codeSql, codeParams).then((result) => {
                        let data1 = JSON.parse(JSON.stringify(result));
                        let temp_auth = {};
                        for (let i = 0; i < data1.length; i++) {
                            if (data1[i].headportrait) {
                                temp_auth[data1[i].id] = [data1[i].username, data1[i].headportrait];
                            } else {
                                temp_auth[data1[i].id] = [data1[i].username, ''];
                            }
                        }
                        for (let j = 0; j < data.length; j++) {
                            data[j].auth = temp_auth[data[j].userid][0];
                            data[j].headPortraits = temp_auth[data[j].userid][1];
                        }
                        if (state === 1 && typeof(userid) === "undefined") {
                            res.send({
                                data: data,
                                pagenum: pagenum,
                                status: 200
                            })
                        } else if (userid || sortstate) {
                            if (state === 1) {
                                res.send({
                                    data: data,
                                    auth: auth,
                                    status: 200
                                })
                            } else {
                                responseResult.success(res, data)
                            }
                        }
                    }).catch((err) => {
                        return next(err);
                    })


                } else {
                    let resData = {
                        msg: '这回真的没有了~'
                    }
                    return responseResult.success(res, resData)
                }
            }).catch((err) => {
                return next(err);
            })
        },
        commentmodule(req, res, next) {
            let resourceid = parseInt(req.body.resourceid), //素材id
                resourcetitle = req.body.resourcetitle, //素材名
                commentatorname = req.body.commentatorname, //评论人name
                commentatorid = parseInt(req.body.commentatorid), //评论人id
                bycommentatorid = parseInt(req.body.bycommentatorid), //被评论人id
                type = parseInt(req.body.type), //1 评论素材 2 回复评论
                content = req.body.content,
                comment_time = tool.localtime(),
                codeSql,
                codeParams;
            if (tool.ArrIsEmpty([resourceid, commentatorid, bycommentatorid, type, content, commentatorname])) {
                return responseResult.error(res, '信息不完整');
            }
            if (type === 1) {
                let index = uuid.v1();
                codeSql = "INSERT INTO `manykit_resourcecomment` SET `resourceid` = ?, `commentatorid` = ?,`bycommentatorid` =?,`type` =?,`index` =?,`content`=?,`comment_time`=?";
                codeParams = [resourceid, commentatorid, bycommentatorid, type, index, content, comment_time];
            } else if (type === 2) {
                let index = req.body.index;
                codeSql = "INSERT INTO `manykit_resourcecomment` SET `resourceid` = ?,`commentatorid`=?,`bycommentatorid`=?,`type`=?,`index`=?,`content`=?,`comment_time`=?";
                codeParams = [resourceid, commentatorid, bycommentatorid, type, `${index}`, content, comment_time];
            }
            publicSql(codeSql, codeParams).then((result) => {
                if (bycommentatorid === commentatorid) {
                    return responseResult.success(res)
                } else {
                    codeSql = "SELECT id,username,message FROM `manykit_user` WHERE `id` = ?";
                    codeParams = [bycommentatorid];
                    publicSql(codeSql, codeParams).then((result) => {
                        if (result.length !== 0) {
                            let data = JSON.parse(JSON.stringify(result));
                            let obj = {
                                "id": resourceid,
                                "commentatorid": commentatorid,
                                "commentatorname": commentatorname,
                                "comment_time": comment_time,
                                "resourcetitle": resourcetitle
                            };
                            let temp_arr = [];
                            if (data[0].message) {
                                temp_arr = JSON.parse(data[0].message);
                            }
                            temp_arr.unshift(obj);
                            let message = JSON.stringify(temp_arr);
                            codeSql = "UPDATE `manykit_user` SET `message` = ? WHERE `id` = ?";
                            codeParams = [message, bycommentatorid];
                            publicSql(codeSql, codeParams).then((result) => {
                                return responseResult.success(res)
                            }).catch((err) => {
                                return next(err);
                            })
                        } else {
                            return responseResult.error(res, '不存在该用户')
                        }
                    }).catch((err) => {
                        return next(err);
                    })
                }

            }).catch((err) => {
                return next(err);
            })
        },
        getcomment(req, res, next) {
            let resourceid = parseInt(req.body.id);
            if (tool.ArrIsEmpty([resourceid])) {
                return responseResult.error(res, '信息不完整');
            }
            let codeSql = "SELECT * FROM `manykit_resourcecomment` WHERE `resourceid` = ?";
            let codeParams = [resourceid];
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    let data = JSON.parse(JSON.stringify(result));
                    let userid_arr = [];
                    Array.from(data, (list) => {
                        userid_arr = [list.commentatorid, list.bycommentatorid, ...userid_arr];
                        return list
                    });
                    let temp_userid_arr = Array.from(new Set(userid_arr));
                    let temp_str1 = temp_userid_arr.join(",");
                    let codeSql = 'SELECT id,username,headportrait FROM manykit_user WHERE find_in_set(id,?)';
                    let codeParams = [temp_str1];
                    publicSql(codeSql, codeParams).then((result) => {
                        if (result.length !== 0) {
                            let userdata = JSON.parse(JSON.stringify(result));
                            let userobj = {};
                            Array.from(userdata, (list) => {
                                userobj[list.id] = {
                                    id: list.id,
                                    username: list.username,
                                    headportrait: list.headportrait,
                                }
                                return list
                            })
                            let num = 0;
                            let temp_obj = {};
                            let temp_arr = [];
                            let reply = {
                                reply: []
                            }
                            Array.from(data, (value) => {
                                value.username = userobj[value.commentatorid]["username"];
                                value.headportrait = userobj[value.commentatorid]["headportrait"];
                                value.comment_time = tool.formatDate(value.comment_time, true)
                                if (value.type === 1) {
                                    temp_obj[value.index] = value;
                                } else if (value.type === 2) {
                                    temp_arr.push(value)
                                }
                                return value
                            })
                            for (let key in temp_obj) {
                                temp_obj[key]["reply"] = [];
                            }
                            Array.from(temp_arr, (value) => {
                                temp_obj[value.index]["reply"].push(value);
                                return value
                            })
                            let resData = Object.values(temp_obj);
                            Array.from(resData, (value) => {
                                num += value.reply.length;
                                return value
                            })
                            num += resData.length;
                            responseResult.success(res, {
                                data: resData,
                                total: num,
                                status: 200
                            });
                        } else {
                            return responseResult.error(res, '不存在该用户')
                        }
                    }).catch((err) => {
                        return next(err);
                    })
                } else {
                    return responseResult.success(res, []);
                }
            }).catch((err) => {
                return next(err);
            })
        },
        getmessage(req, res, next) {
            let resourceid = req.body.id,
                codeSql = "SELECT id,username,message FROM `manykit_user` WHERE `id` = ?",
                codeParams = [bycommentatorid];
            publicSql(codeSql, codeParams).then((result) => {
                if (result.length !== 0) {
                    let data = JSON.parse(JSON.stringify(result));
                    let resData = Array.from(data, (value) => {
                        value.comment_time = tool.formatDate(value.comment_time, true);
                        return value
                    })
                    return responseResult.success(res, resData)
                } else {
                    return responseResult.error(res, '不存在该用户')
                }
            }).catch((err) => {
                return next(err);
            })
        }
    }
}