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

const sequelizeInstance = new Sequelize(DB_URL);
const chartData = require('./models/chartData.model')(sequelizeInstance);
const transaction = require('./models/transaction.model')(sequelizeInstance);
const bbands = require('./models/bbands.model')(sequelizeInstance);

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
      if (err) reject(err);
      resolve(calculations.result)
      bbands.create({
        prices: data.map(el => el.close),
        upperBand: calculations.result.outRealUpperBand,
        lowerBand: calculations.result.outRealLowerBand,
        middleBand: calculations.result.outRealMiddleBand,
        dates: data.map(el => el.date)
      })
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
      if (err) reject(err);
      resolve(calculations.result)
    })
  })
}

let rawData, profit = 0;

function calculate(buffer) {
  let lowerBand;
  getBBands(buffer)
    .then((bbands) => {
      lowerBand = bbands.outRealLowerBand;
      return getRsi(buffer);
    })
    .then((rsi) => {
      let lastLowerBand = lowerBand[lowerBand.length - 1],
        lastRsi = rsi[rsi.length - 1],
        lastBuffer = buffer[buffer.length - 1];

      if (
        (lastLowerBand > lastBuffer.close) &&
        (lastRsi < 20)
      ) {
        transaction.create({
          amount: INVEST_QUANTITY,
          currency: CURRENCY_PAIR,
          type: 'sell'
        });
        let diff = buyPrice - lastBuffer.close
        profit += diff;
        console.log('SELL');
        console.log('Profit from current: ' + diff);
        console.log('Overall profit: ' + profit);
        return false
      } else
      if (lastBuffer.close > lastLowerBand) {
        buyPrice = lastBuffer.close;
        profit -= buyPrice
        transaction.create({
          amount: INVEST_QUANTITY,
          currency: CURRENCY_PAIR,
          profit: profit - buyPrice
          type: 'buy'
        });
        console.log('BUY');
        console.log('Profit remaining: ' + profit - buyPrice);
        console.log('Overall profit: ' + profit);
        return true
      }
    });
}

Promise.all([
    chartData.sync({ force: true }),
    transaction.sync(),
    bbands.sync()
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
    chartData.bulkCreate(rawData)
    return rawData;
  })
  .then((data) => getBBands(data))
  .then((result) => {
    BBands = result;
    return getRsi(rawData)
  })
  .then((result) => {
    rsi = result.outReal;
    let hasBuy = false;
    rawData.forEach((item, i) => {
      if (rawData[i - 2] && rawData[i - 1]) {
        hasBuy = calculate([item, rawData[i - 1], rawData[i - 2]])
      }
    });
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(0)
  })
