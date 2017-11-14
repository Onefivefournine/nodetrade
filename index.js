const Sequelize = require('sequelize');
const axios = require('axios');
const talib = require('talib');
const moment = require('moment');

const CURRENCY_PAIR = 'BTC_XMR';
const INVEST_QUANTITY = 0.01;

const START = moment().subtract(21, 'days').unix();
const END = 9999999999 // moment().unix();
const PERIOD = 900; // 300, 900, 1800, 7200, 14400, or 86400
const RSI_TRESHOLD = 30;

const DATA_URL = `https://poloniex.com/public?command=returnChartData&currencyPair=${CURRENCY_PAIR}&start=${START}&end=${END}&period=${PERIOD}`;
const DB_URL = 'mysql://root:123@localhost:3306/testdb';

const sequelizeInstance = new Sequelize(DB_URL, { logging: false });
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

let rawData,
  hasBuy = false,
  profit = 0;

function calculate(buffer) {
  if (buffer.length) {
    let lowerBand;
    return getBBands(buffer)
      .then((bbands) => {
        lowerBand = bbands.outRealLowerBand;
        return getRsi(buffer);
      })
      .then((rsi) => {
        let lastLowerBand = lowerBand[lowerBand.length - 1],
          lastRsi = rsi.outReal[rsi.outReal.length - 1],
          lastBuffer = buffer[buffer.length - 1];

        console.log(lastLowerBand, lastRsi, lastBuffer.close);

        if (
          lastLowerBand && lastRsi && lastBuffer.close &&
          (lastBuffer.close < lastLowerBand) &&
          (lastRsi < RSI_TRESHOLD) &&
          hasBuy
        ) {
          let diff = lastBuffer.close * INVEST_QUANTITY - buyPrice;
          profit = diff;
          transaction.create({
            price: lastBuffer.close,
            investQuantity: INVEST_QUANTITY,
            currency: CURRENCY_PAIR,
            profit,
            type: 'sell'
          });
          console.log('SELL');
          console.log('Profit from current: ' + diff);
          console.log('Overall profit: ' + profit);
          hasBuy = false
        } else if (lastLowerBand && lastRsi && lastBuffer.close &&
          lastBuffer.close > lastLowerBand && !hasBuy) {
          buyPrice = lastBuffer.close * INVEST_QUANTITY;
          profit -= buyPrice;

          transaction.create({
            price: lastBuffer.close,
            investQuantity: INVEST_QUANTITY,
            currency: CURRENCY_PAIR,
            profit,
            type: 'buy'
          });
          console.log('BUY');
          console.log('Overall profit: ' + profit);
          hasBuy = true
        }
      })
      .catch((err) => {
        console.error(err)
      });
  } else {
    return Promise.reject('NO BUFFER LENGTH')
  }
}

Promise.all([
    chartData.sync({ force: true }),
    transaction.sync(),
    bbands.sync({ force: true })
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
  .then((result) => {
    return rawData.reverse().reduce((sum, item, i) => {
      return sum.then(() => {
          return calculate(rawData)
        })
        .then(() => {
          rawData.pop();
          // console.log(rawData.length);
        })
    }, Promise.resolve());
  })
  .then(() => {
    console.log('End profit is: ' + profit);
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(0)
  })
