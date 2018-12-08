//验证规则
let tool = require('./tool');
const rules = {
    username: {
        minLength: 4,
        maxLength: 16,
        username(username) {
            return tool.validateId(username);
        },
        prompot: '用户名不合法,只可以使用英文和数字。'
    },
    password: {
        minLength: 6,
        maxLength: 20,
        prompot: '密码不合法,只可以使用英文和数字。',
        password(password) {
            return tool.validateId(password);
        },
    }
}
module.exports = rules;