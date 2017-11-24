const Base = require('./base');
const CalculateMixin = require('./calculate');
const { CoinData } = require('./models/CoinData');
const { Settings } = require('./models/Settings');
const { Transaction } = require('./models/Transaction')
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const DB_URL = 'mongodb://localhost:27017/nodetrade2';
let self;
class BackTester extends CalculateMixin(Base) {
    constructor(coinName) {
        super()
        self = this;
        self.start();
    }
    async start() {
        await self.to(self.connectToDb(DB_URL));
        self.getCoinData();
    }
    async getCoinData() {
        self.coinDatas = await self.to(CoinData.find({}).sort({ date: 1 }));

        // uncomment this to use settings from db
        // self.sets = await self.to(Settings.findOneOrCreate({}, {})); 

        self.sets = {
            logLevel: 3, // 3 - debug, 2 - verbose, 1 - errors, 0 - none

            risesInRowToBuy: 3,
            minSellThreshold: 0.5,
            maxSellThreshold: 10,
            minRiseToBePositive: 0.5,
            minFallToBeNegative: 0.5,
            sellThresholdDecrease: 3,
        }

        self.performCalculations();
    }
    performCalculations() {
        self.coinDatas.forEach((cdata, i) => {
            if (self.coinDatas[i - 1]) {
                self.currentCoinData = cdata.coinList;
                self.previousCoinData = self.coinDatas[i - 1].coinList;

                Object.keys(self.currentCoinData).forEach((coinKey) => {
                    self.log(2, ['Backtesting coinData #%s - coin %s...', i, coinKey])
                    self.calculate(coinKey, true)
                })
            }
        });

        let profitWithoutSelling = 0;
        let overallProfit = Object.keys(self.currentCoinData).reduce((sum, key) => {
            if (!self.currentCoinData[key].hasBuy) {
                profitWithoutSelling += self.currentCoinData[key].profit;
                return sum + self.currentCoinData[key].profit;
            }
            return sum + self.currentCoinData[key].profit + self.currentCoinData[key].price;
        }, 0)

        self.log(2, ['Backtesting ended ...']);
        self.log(2, ['Profit without selling: %s', profitWithoutSelling]);
        self.log(2, ['Overall profit (with selling coins): %s', overallProfit]);
        process.exit(0)

    }
}

module.exports = new BackTester();