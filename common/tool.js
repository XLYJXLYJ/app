let moment = require('moment');
moment.locale('zh-cn'); // 使用中文

module.exports = {
    // 获取验证码方法函数 生成随机字符串
    randomString(len, charSet) {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var randomString = '';
        for (var i = 0; i < len; i++) {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return randomString;
    },
    //获取当前时间
    localtime(fromtime) {
        let p = (s) => {
            return s < 10 ? "0" + s : s;
        }
        let date;
        if (fromtime) {
            date = new Date(fromtime);
        } else {
            date = new Date();
        }
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let hour = date.getHours();
        let minute = date.getMinutes();
        let second = date.getSeconds();
        let time = year + '-' + month + '-' + day + ' ' + p(hour) + ':' + p(minute) + ':' + p(second);
        return time;
    },
    // 格式化时间
    formatDate(date, friendly) {
        date = moment(date);
        if (friendly) {
            return date.fromNow();
        } else {
            return date.format('YYYY-MM-DD HH:mm');
        }
    },
    //验证字符是否为英文和数字
    validateId(str) {
        return (/^[a-zA-Z0-9\-_]+$/i).test(str);
    },
    //验证数组里面是否包含空字符串或者undefind
    ArrIsEmpty(arr) {
        return arr.some((item) => {
            if(item === undefined || item === "") {
                return true;
            }else{
                return false;
            }
        })
    }
}