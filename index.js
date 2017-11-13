const Sequelize = require('sequelize');
const axios = require('axios');
const talib = require('talib');
const moment = require('moment');

const CURRENCY_PAIR = 'BTC_ETH';
const INVEST_QUANTITY = 0.01;

const START = 1508250645 //moment().subtract(21, 'days').unix();
const END = 9999999999 // moment().unix();
// 300, 900, 1800, 7200, 14400, or 86400
const PERIOD = 900;

const DATA_URL = `https://poloniex.com/public?command=returnChartData&currencyPair=${CURRENCY_PAIR}&start=${START}&end=${END}&period=${PERIOD}`;
const DB_URL = 'mysql://root:123@localhost:3306/testdb';

const sequelize = new Sequelize(DB_URL);
const chartData = require('./models/chartData.model')(sequelize);
const transaction = require('./models/transaction.model')(sequelize);

function getBBands(data) {
  return new Promise((resolve, reject) => {
    talib.execute({
      name: "BBANDS",
      startIdx: 0,
      endIdx: data.length - 1,
      inReal: data.map(el => el.close),
      optInTimePeriod: 21,
      optInNbDevUp: 2,
      optInNbDevDn: 2,
      optInMAType: 0
    }, function(err, calculations) {

      console.log('BBANDS', calculations);
      if (err) reject(err);
      resolve(calculations.result)
      // bbands.create({
      //   prices: JSON.stringify(data.map(el => el.close)),
      //   upperBand: JSON.stringify(res.result.outRealUpperBand),
      //   lowerBand: JSON.stringify(res.result.outRealLowerBand),
      //   middleBand: JSON.stringify(res.result.outRealMiddleBand),
      // })
    })
  })
}

function getRsi(data) {
  return new Promise((resolve, reject) => {
    talib.execute({
      name: "RSI",
      startIdx: 0,
      endIdx: data.length - 1,
      inReal: data.map(el => el.close),
      optInTimePeriod: 14,

    }, function(err, calculations) {
      console.log('RSI', calculations);
      if (err) reject(err);
      resolve(calculations.result)
      // bbands.create({
      //   prices: JSON.stringify(data.map(el => el.close)),
      //   upperBand: JSON.stringify(res.result.outRealUpperBand),
      //   lowerBand: JSON.stringify(res.result.outRealLowerBand),
      //   middleBand: JSON.stringify(res.result.outRealMiddleBand),
      // })
    })
  })
}

function calculate(BBands, rsi, rawData) {
  let lowerBand = BBands.outRealLowerBand;
  const getLast = arr => arr[arr.length - 1];

  if (
    (getLast(lowerBand) > getLast(rawData).close) &&
    (getLast(rsi) < 20)
  ) {
    transaction.create({
      amount: INVEST_QUANTITY,
      currency: CURRENCY_PAIR,
      type: 'sell'
    });
  } else if (getLast(rawData).close > getLast(lowerBand)) {
    transaction.create({
      amount: INVEST_QUANTITY,
      currency: CURRENCY_PAIR,
      type: 'buy'
    });
  }
}

let BBands, rsi, rawData;

Promise.all([
chartData.sync({ force: true }),
transaction.sync()
  ])
  .then(() => axios.get(DATA_URL))
  .then((res) => {
    rawData = res.data.map((el) => {
      el.date = moment.unix(el.date);
      el.period = PERIOD;
      el.coinPair = CURRENCY_PAIR;
      el.createdAt = Date.now()
      return el
    });
    return rawData;
  })
  .then((data) => getBBands(data))
  .then((result) => {
    BBands = result;
    return getRsi(rawData)
  })
  .then((result) => {
    rsi = result.outReal;
    calculate(BBands, rsi, rawData);
    return chartData.bulkCreate(rawData)
  })
  .catch((err) => console.error(err))
