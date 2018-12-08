module.exports = {
    res: {
        //session验证
        verify: '/res/verify',
        //退出
        logout: '/res/logout',
        //邮箱注册
        signup: '/res/signup',
        //邮箱注册
        signup: '/res/signup',
        //账号激活
        active: '/res/active',
		//第三方用户登陆
        thirdlogin: '/res/thirdlogin',
        //用户登陆
        login: '/res/login',
        //snap用户登陆
        snaplogin: '/res/snaplogin',
        //忘记密码 获取验证码
        getverifycode: '/res/getverifycode',
        //忘记密码注册码验证
        checkcode: '/res/checkcode',
        //修改密码
        setpassword: '/res/setpassword',
        //更新密码
        updatepassword: '/res/updatepassword',
        //个人信息
        userinfo: '/res/userinfo',
        //收藏，点赞，关注
        useropreate: '/res/useropreate',
        //新增删除修改文件
        upload: '/res/upload',
        //文件3发布 4 回收站 5 删除 6 取消发布 
        dealfile: '/res/dealfile',
        //获取项目
        getfile: '/res/getfile',
        //测试图片
        testimg: '/res/testimg',
        //读取文件列表
        filelist: '/res/filelist',
        //读取资源商城列表
        resourcelist: '/res/resourcelist',
        //采集删除 素材
        collectmaterial: '/res/collectmaterial',
        //上传资源素材
        uploadresource: '/res/uploadresource',
        //上传资源素材
        uploadresource: '/res/uploadresource',
    },
    toycar: {
        //项目新建编辑删除
        project: '/toycar/project',
        //项目列表
        projectList: '/toycar/projectList',
        //读取项目
        getproject: '/toycar/getProject',
    },
    tool: {
        mdToHtml: '/res/mdToHtml'
    },
    music: {
        list: '/api/music/list',
        search: '/api/music/search',
        song: '/api/music/song',
    },
    material: {
        //上传头像和素材封面图
        uploadHeadPortrait: '/api/material/uploadHeadPortrait',
        //上传素材
        uploadmaterial: '/api/material/uploadmaterial',
        //获取素材
        getmodule: '/api/material/getmodule',
        //处理素材
        dealmodule: '/api/material/dealmodule',
        //获取素材列表
        modulelist: '/api/material/modulelist',
        //作者信息
        userinfo: '/api/material/userinfo',
        //收藏，点赞，关注
        useropreate: '/api/material/useropreate',
        //评论
        commentmodule: '/api/material/commentmodule',
        //获取评论列表
        getcomment: '/api/material/getcomment',
        //获取消息列表
        getmessage: '/api/material/getmessage',

    },
    user: {
        "thirdlogin": '/api/user/thirdlogin'
    }

}