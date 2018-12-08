let responseResult = {
    success(res, data) {
        if (data) {
            return res.send({
                data: data,
                status: 200
            })
        } else {
            return res.send({
                data: true,
                status: 200
            })
        }
    },
    error(res, errmsg) {
        if (errmsg) {
            return res.send({
                errmsg: errmsg,
                status: 200
            })
        } else {
            return res.send({
                data: false,
                status: 200
            })
        }

    },
    //验证数据是否正确
    isError(obj, res) {
        for (let key in obj) {
            if (!obj[key]) {
                return responseResult.error(res)
            }
        }
    },
};
module.exports = responseResult;