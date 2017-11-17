const moment = require('moment');
module.exports = {
    currency_pair: "BTC_XMR",
    invest_quantity: 0.1,
    start_date: moment().subtract(21, 'days').unix(),
    end_date: 9999999999,
    period: 900, // 300, 900, 1800, 7200, 14400, or 86400
    rsi_threshold: 40,
    lowerBand_threshold: 0.00005,
    upperBand_threshold: 0.00005,
    db: {
        name: 'testdb',
        host: 'localhost',
        port: '3306',
        user: 'root',
        password: '',
    }
}