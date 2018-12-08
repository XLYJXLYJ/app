let log4js = require('log4js');
log4js.configure({
    replaceConsole: true,
    appenders: {
        console: { //控制台输出
            type: 'console'
        },
        req: { //请求日志
            type: 'dateFile',
            filename: 'logs/reqlog/',
            pattern: 'req-yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        err: { //错误日志
            type: 'dateFile',
            filename: 'logs/errlog/',
            pattern: 'err-yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        oth: { //其他日志
            type: 'dateFile',
            filename: 'logs/othlog/',
            pattern: 'oth-yyyy-MM-dd.log',
            alwaysIncludePattern: true
        }
    },
    categories: {
        default: {
            appenders: ['console', 'req'],
            level: 'debug'
        }, //appenders:采用的appender,取appenders项,level:设置级别
        err: {
            appenders: ['console', 'err'],
            level: 'error'
        },
        oth: {
            appenders: ['console', 'oth'],
            level: 'info'
        }
    }
})
module.exports = {
    getLogger(name) { //name取categories项
        return log4js.getLogger(name || 'default')
    },
    useLogger(app, logger) { //用来与express结合
        app.use(log4js.connectLogger(logger || log4js.getLogger('default'), {
            format: '[:remote-addr :method :url :status :response-timems][:referrer HTTP/:http-version :user-agent]' //自定义输出格式
        }))
    }
};