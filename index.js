const Sequelize = require('sequelize');
const axios = require('axios');
const talib = require('talib');
const moment = require('moment');
const config = require('./config.json');
const CURRENCY_PAIR = 'BTC_XMR';
const INVEST_QUANTITY = 0.1; //0.01;

const START = moment().subtract(21, 'days').unix();
const END = 9999999999 // moment().unix();
const PERIOD = 900; // 300, 900, 1800, 7200, 14400, or 86400
const RSI_THRESHOLD = 40;

const DATA_URL = `https://poloniex.com/public?command=returnChartData&currencyPair=${CURRENCY_PAIR}&start=${START}&end=${END}&period=${PERIOD}`;
const DB_URL = 'mysql://root:123@localhost:3306/testdb';

const sequelizeInstance = new Sequelize(DB_URL, { logging: false });
const chartDataModel = require('./models/chartData.model')(sequelizeInstance);
const transactionModel = require('./models/transaction.model')(sequelizeInstance);
const bbandsModel = require('./models/bbands.model')(sequelizeInstance);

function storeBBands(rawData, bbands, rsi) {
  const s = JSON.stringify;
  return bbandsModel.create({
    dates: s(rawData.map(el => el.date)),
    prices: s(rawData.map(el => el.close)),
    lowerBand: s(bbands.result.outRealLowerBand),
    middleBand: s(bbands.result.outRealMiddleBand),
    upperBand: s(bbands.result.outRealUpperBand),
    rsi: s(rsi.outReal)
  })
}

function getBBands(data, total) {
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
    }, function(err, bbandsData) {
      if (err) reject(err);
      if (total) {
        getRsi(data)
          .then(rsi => storeBBands(data, rsi, bbandsData))
          .catch(err => { console.error(err) })
      }
      resolve(bbandsData.result);
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
    }, function(err, rsiData) {
      if (err) reject(err);
      resolve(rsiData.result)
    })
  })
}

let rawData,
  hasBuy = false,
  profit = 0,
  buyPrice,
  transactions = [];

function buy(lastBuffer) {
  buyPrice = lastBuffer.close * INVEST_QUANTITY;
  profit -= buyPrice;

  transactions.push({
    date: lastBuffer.date,
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

function sell(lastBuffer) {
  let diff = lastBuffer.close * INVEST_QUANTITY - buyPrice;
  profit = diff;
  transactions.push({
    date: lastBuffer.date,
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
}

async function calculate(buffer) {
  if (buffer.length > 1) {
    let lowerBand, upperBand;
    return getBBands(buffer)
      .then((bbands) => {
        lowerBand = bbands.outRealLowerBand;
        upperBand = bbands.outRealUpperBand;
        return getRsi(buffer);
      })
      .then((rsi) => {
        let lastLowerBand = lowerBand[lowerBand.length - 1],
          lastUpperBand = upperBand[upperBand.length - 1]
        lastRsi = rsi.outReal[rsi.outReal.length - 1],
          lastBuffer = buffer[buffer.length - 1];

        console.log(lastLowerBand, lastBuffer.close, lastUpperBand, lastRsi);

        if (
          lastLowerBand && lastRsi && lastBuffer.close &&
          (lastBuffer.close > lastUpperBand ||
            lastRsi < RSI_THRESHOLD) &&
          hasBuy
        ) {
          sell(lastBuffer)
        } else if (lastUpperBand && lastRsi && lastBuffer.close &&
          lastBuffer.close < lastLowerBand && !hasBuy) {
          buy(lastBuffer)
        }
      })
      .catch((err) => {
        console.error(err)
      });
  } else if (buffer.length === 1 && hasBuy) {
    sell(buffer[buffer.length - 1])
  } else if (!buffer.length) {
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
    }).sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    getBBands(rawData, true)
      .then(() => getRsi(rawData, true));

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
        })
    }, Promise.resolve());
  })

  .then(() => transaction.bulkCreate(transactions))
  .then(() => {
    console.log('End profit is: ' + profit);
    sequelizeInstance.close()
  })
  .catch((err) => {
    console.error(err)
  })
