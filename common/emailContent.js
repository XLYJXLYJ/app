module.exports = {
    //激活账号邮件
    activeEmail(mail, username, cdkey, headerReferer,callback) {
        let mailHtml = `
        <div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        欢迎你注册ManyKit Snap图形编程！</span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        </span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        你选择的用户名为:</span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">&nbsp; &nbsp;
        ${mail}
        </span></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        请点击激活链接激活账号：</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">  
        <a href="https://www.manykit.com/res/active?cdkey=${username}${cdkey}&a=${headerReferer}">https://www.manykit.com/res/active?cdkey=${username}${cdkey}&a=${headerReferer}</a>
        </font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        </font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        链接24小时内有效。</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        如果你有任何注册相关的问题，欢迎联系我们。</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei"><br></font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">官网：<a href="https://www.manykit.com">www.manykit.com</a></font></div>
        `;
        callback(mailHtml);
    },
    //验证码邮件
    codeEmail(code, callback) {
        let mailHtml = `
        <div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        欢迎登录ManyKit Snap图形编程！</span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        </span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        请不要将验证码透露给他人</span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">  
        </span></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        验证码为：</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">  
        ${code}
        </font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei"><br></font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        验证码10分钟内有效。</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        如果你有任何账号相关的问题，欢迎联系我们。</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei"><br></font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">官网：<a href="https://www.manykit.com">www.manykit.com</a></font></div>`;
        callback(mailHtml);
    }
}