const Sequelize = require('sequelize');
const axios = require('axios');
const Talib = require('talib');
const moment = require('moment');
const config = require('./config');

const DATA_URL = `https://poloniex.com/public?command=returnChartData&currencyPair=${config.currency_pair}&start=${config.start_date}&end=${config.end_date}&period=${config.period}`;
const DB_URL = `mysql://${config.db.user}${config.db.password?':'+config.db.password:''}@${config.db.host}:${config.db.port}/${config.db.name}`;

const sequelizeInstance = new Sequelize(DB_URL, { logging: false });
const chartDataModel = require('./models/chartData.model')(sequelizeInstance);
const transactionModel = require('./models/transaction.model')(sequelizeInstance);
const bbandsModel = require('./models/bbands.model')(sequelizeInstance);

// async/await helper
function to(promise) {
  return promise
    .then(data => [null, data])
    .catch(err => {
      console.error(err);
      return [err]
    });
}

// store overall bbands data, needed for front.html
function storeBBands(rawData, bbands, rsi) {
  const s = JSON.stringify;
  return bbandsModel.create({
    dates: s(rawData.map(el => el.date)),
    prices: s(rawData.map(el => el.close)),
    lowerBand: s(bbands.outRealLowerBand),
    middleBand: s(bbands.outRealMiddleBand),
    upperBand: s(bbands.outRealUpperBand),
    rsi: s(rsi.outReal)
  })
}

function executeTalib(params, cb) {
  return new Promise((resolve, reject) => {
    Talib.execute(params, (params.name === 'BBANDS') ? cb(resolve, reject) : function(err, data) {
      if (err) reject(err);
      resolve(data.result)
    })
  })
}

function getBBands(data, total) {
  return executeTalib({
    name: "BBANDS",
    startIdx: 0,
    endIdx: data.length - 1,
    inReal: data.map(el => el.close),
    optInTimePeriod: 21,
    optInNbDevUp: 2,
    optInNbDevDn: 2,
    optInMAType: 2
  }, (resolve, reject) => async function(err, bbandsData) {
    if (err) reject(err);
    if (total) {
      let [errRsi, rsi] = await to(getRsi(data));
      let [errBbands, result] = await to(storeBBands(data, bbandsData.result, rsi))
    }
    resolve(bbandsData.result);
  });
}

function getRsi(data) {
  return executeTalib({
    name: "RSI",
    startIdx: 0,
    endIdx: data.length - 1,
    inReal: data.map(el => el.close),
    optInTimePeriod: 14,
  });
}

let rawData,
  hasBuy = false,
  profit = 0,
  buyPrice,
  transactions = [];

function buyOrSell(lastBuffer, isBuy) {
  if (isBuy) {
    buyPrice = lastBuffer.close * config.invest_quantity;
    profit -= buyPrice;
    console.log('BUY');
    console.log('buyPrice: ', buyPrice);
    console.log('Overall profit: ', profit);
    hasBuy = true
  } else {
    let diff = lastBuffer.close * config.invest_quantity - (buyPrice || 0);
    profit = diff;
    console.log('SELL');
    console.log('Profit from current: ', diff);
    console.log('Overall profit: ', profit);
    hasBuy = false
  }

  transactions.push({
    date: lastBuffer.date,
    price: lastBuffer.close,
    investQuantity: config.invest_quantity,
    currency: config.currency_pair,
    profit,
    type: isBuy ? 'buy' : 'sell'
  });
}

async function calculate(buffer) {
  if (buffer.length > 1) {
    let [errBbands, bbands] = await to(getBBands(buffer));
    let [errRsi, rsi] = await to(getRsi(buffer));

    const getLast = arr => arr[arr.length - 1];

    let lastLowerBand = getLast(bbands.outRealLowerBand),
      lastUpperBand = getLast(bbands.outRealUpperBand),
      lastRsi = getLast(rsi.outReal),
      lastBuffer = getLast(buffer);

    console.log(lastLowerBand, lastBuffer.close, lastUpperBand, lastRsi);

    if (
      lastLowerBand &&
      lastRsi &&
      lastBuffer.close &&
      (lastBuffer.close > (lastUpperBand - config.upperBand_threshold) ||
        lastRsi < config.rsi_threshold) &&
      hasBuy
    ) {
      buyOrSell(lastBuffer, false)
    } else if (
      lastUpperBand &&
      lastRsi &&
      lastBuffer.close &&
      lastBuffer.close < (lastLowerBand + config.lowerBand_threshold) &&
      !hasBuy
    ) {
      buyOrSell(lastBuffer, true)
    }
  } else if (buffer.length === 1 && hasBuy) {
    buyOrSell(lastBuffer, false)
  } else if (!buffer.length) {
    return Promise.reject('NO BUFFER LENGTH')
  }
}

function calculateTransactions(data) {
  return data.reverse().reduce((sum, item, i) => {
    return sum.then(async function() {
      await to(calculate(data));
      data.pop();
    })
  }, Promise.resolve());
}

function syncDB() {
  return Promise.all([
        chartDataModel.sync({ force: true }),
        transactionModel.sync({ force: true }),
        bbandsModel.sync({ force: true })
    ]);
}

async function start() {
  await to(syncDB());
  let [err, { data: preRawData }] = await to(axios.get(DATA_URL));
  rawData = preRawData.map((el) => {
    el.date = moment.unix(el.date);
    el.period = config.period;
    el.coinPair = config.currency_pair;
    el.createdAt = Date.now()
    return el
  }).sort((a, b) => {
    return Date.parse(a.date) - Date.parse(b.date);
  });

  await to(getBBands(rawData, true));
  await to(getRsi(rawData, true));
  await to(chartDataModel.bulkCreate(rawData));
  await to(calculateTransactions(rawData));
  await to(transactionModel.bulkCreate(transactions));

  console.log('End profit is: ' + profit);
  sequelizeInstance.close()
}

start();
