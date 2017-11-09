const Sequelize = require('sequelize');
const axios = require('axios');
const talib = require('talib');
const moment = require('moment');

const CURRENCY_PAIR = 'BTC_XMR';
const START = moment().subtract(21, 'days').unix();
const END = moment().unix();
// 300, 900, 1800, 7200, 14400, or 86400
const PERIOD = 86400;

const DATA_URL = `https://poloniex.com/public?command=returnChartData&currencyPair=${CURRENCY_PAIR}&start=${START}&end=${END}&period=${PERIOD}`;

const sequelize = new Sequelize('mysql://root:123@localhost:3306/testdb');
const chartData = require('./chartData.model')(sequelize);

chartData.sync({ force: true })
  .then(() => axios.get(DATA_URL))
  .then((res) => {
    let data = res.data.map((el) => {
      el.date = moment.unix(el.date);
      el.period = PERIOD;
      el.coinPair = CURRENCY_PAIR;
      el.createdAt = Date.now()
      return el
    });
    console.log('data.length', data.length);
    data.forEach(function(dataElem, index) {
      talib.execute({
        name: "BBANDS",
        startIdx: 0,
        endIdx: dataElem.close.length - 1,
        inReal: dataElem.close,
      }, function(err, result) {

        console.log("Function Results:");
        console.log(result);

      });
    });


    return chartData.bulkCreate(data)
  })
  .catch((err) => console.error(err))
  .finally(() => { process.exit(0) })
