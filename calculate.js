const { Transaction } = require('./models/Transaction');
const bittrex = require('node-bittrex-api');

let self;
module.exports = (superclass) => class CalculationMixin extends superclass {
    constructor() {
        super();
        self = this;
    }
    calculate(coinKey, isBacktest) {
        let prev = self.previousCoinData[coinKey],
            curr = self.currentCoinData[coinKey];
        if (prev) {
            let diff = (curr.price - prev.price) * 100 / prev.price;
            curr.sellThreshold = prev.sellThreshold || self.sets.minSellThreshold;
            curr.risesInRow = prev.risesInRow || 0;
            curr.fallsInRow = prev.fallsInRow || 0;
            curr.hasBuy = prev.hasBuy || false;
            curr.lastBuyPrice = prev.lastBuyPrice || 0;
            curr.profit = prev.profit || 0;

            // comment self if statement to see logs for small changes
            if (!curr.hasBuy && (diff === 0 || (diff > 0 && diff < self.sets.minRiseToBePositive) || (diff < 0 && Math.abs(diff) < self.sets.minFallToBeNegative))) {
                // rise/fall is not strong enough
                return;
            }
            self.log(3, ['\n************************** %s START **************************', coinKey]);
            if (diff > 0) {
                // we have a rise
                self.log(3, ['Diff is: %s% and minRiseToBePositive: %s%', diff, self.sets.minRiseToBePositive]);
                if (diff > self.sets.minRiseToBePositive) {
                    // rise is greater than threshold
                    self.log(3, ['Rise of %s is greater than minRiseToBePositive', curr.currency]);

                    curr.risesInRow++;
                    curr.fallsInRow = 0;

                    if (curr.risesInRow >= self.sets.risesInRowToBuy) {
                        // rise is continious
                        if (!curr.hasBuy) {
                            // Buy
                            curr.hasBuy = true;
                            curr.sellThreshold = self.sets.minSellThreshold;
                            curr.lastBuyPrice = curr.price;

                            self.log(2, ['BUY %s for %s', curr.currency, curr.price]);
                            let tr = {
                                type: 'buy',
                                price: curr.price,
                                profit: curr.profit,
                                currency: curr.currency,
                                backtest: isBacktest
                            }

                            if (!isBacktest) self.wsSend('transaction', tr)
                            Transaction.create(tr);

                            // CAUTION! Uncomment only when you are ready to live trade!
                            // if(self.sets.liveTrading && !isBacktest){
                            //   self.bittrexPerformTransaction(tr)
                            // }

                        } else {
                            // already bought, increase threshold
                            self.increaseSellThreshold(prev, curr);
                        }
                    } else {
                        self.log(3, ['Not enough rises in row, current value - %s', curr.risesInRow])
                    }
                } else {
                    // rise is smaller than threshold
                    self.log(3, ['Rise of %s is smaller than minRiseToBePositive', curr.currency])
                }
            } else if (diff < 0) {
                // we have a fall
                self.log(3, ['Diff is: %s% and minFallToBeNegative: %s%', diff, self.sets.minFallToBeNegative]);
                if (Math.abs(diff) > self.sets.minFallToBeNegative) {
                    // fall is strong enough
                    self.log(3, ['Fall of %s is greater than minFallToBeNegative', curr.currency]);

                    curr.fallsInRow++;
                    curr.risesInRow = 0;

                    if (curr.hasBuy) {
                        // this currency was bought before
                        if (Math.abs(diff) > curr.sellThreshold) {
                            // fall is greater than current threshold

                            curr.hasBuy = false;
                            curr.profit += (curr.price - curr.lastBuyPrice) * 100 / curr.lastBuyPrice;
                            curr.lastBuyPrice = 0;
                            curr.sellThreshold = self.sets.minSellThreshold;

                            self.log(2, ['SELL %s for %s, profit is: %s%', curr.currency, curr.price, curr.profit]);
                            let tr = {
                                type: 'sell',
                                price: curr.price,
                                profit: curr.profit,
                                currency: curr.currency,
                                backtest: isBacktest
                            };

                            if (!isBacktest) self.wsSend('transaction', tr)
                            Transaction.create(tr);

                            // CAUTION! Uncomment only when you are ready to live trade!
                            // if(self.sets.liveTrading && !isBacktest){
                            //   self.bittrexPerformTransaction(tr)
                            // }
                        } else {
                            // fall is smaller than threshold 
                            self.decreaseSellThreshold(curr);
                        }
                    } else {
                        // haven't bought self currency before, nothing to sell
                        self.log(3, ['But we have not bought %s', curr.currency])
                    }
                }
            } else if (diff === 0) {
                // price not changed
                self.log(3, ['Price for %s not changed', curr.currency]);
            }
        }
        self.log(3, ['************************** %s END **************************\n', coinKey]);
    }

    async bittrexPerformTransaction(tr) {
        let balance = await self.to(self.bittrexGetBalance());
        if (balance.result.Available >= tr.price) {
            if (tr.type === 'buy') {
                await self.bittrexBuy(tr)
            } else {
                await self.bittrexSell(tr)
            }
        }
    }
    bittrexSell(tr) {
        return new Promise((resolve, reject) => {
            bittrex.tradesell({
                MarketName: tr.currency,
                OrderType: 'LIMIT',
                Quantity: 1.00000000,
                Rate: tr.price, // not sure
                TimeInEffect: 'IMMEDIATE_OR_CANCEL', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
                ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
                Target: 0, // used in conjunction with ConditionType
            }, function(data, err) {
                if (err) reject(err);
                resolve(data)
            });
        });
    }
    bittrexBuy(tr) {
        return new Promise((resolve, reject) => {
            bittrex.tradebuy({
                MarketName: tr.currency,
                OrderType: 'LIMIT',
                Quantity: 1.00000000,
                Rate: tr.price, // not sure
                TimeInEffect: 'IMMEDIATE_OR_CANCEL', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
                ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
                Target: 0, // used in conjunction with ConditionType
            }, function(data, err) {
                if (err) reject(err);
                resolve(data)
            });
        });

    }
    bittrexGetBalance() {
        return new Promise((resolve, reject) => {
            bittrex.getbalance({ currency: 'BTC' }, function(data, err) {
                if (err) reject(err);
                resolve(data)
            });
        });
    }

    decreaseSellThreshold(curr) {
        if (curr.sellThreshold - self.sets.sellThresholdDecrease >= self.sets.minSellThreshold) {
            // decreased by fixed value
            curr.sellThreshold -= self.sets.sellThresholdDecrease;
            self.log(3, ['Sell threshold for %s decreased, current value is %s%', curr.currency, curr.sellThreshold]);
        } else {
            // decreased to min
            curr.sellThreshold = self.sets.minSellThreshold;
            self.log(3, ['Sell threshold reached minimum at %s%', self.sets.minSellThreshold]);
        }
    }
    increaseSellThreshold(prev, curr) {
        let changeTo = (curr.price - prev.price) * 100 / prev.price;
        if (curr.sellThreshold + changeTo < self.sets.maxSellThreshold) {
            // increase threshold to fixed value
            curr.sellThreshold += changeTo;
            self.log(3, ['Sell threshold for %s increased, current value is %s%', curr.currency, curr.sellThreshold]);
        } else {
            // increase threshold to max
            curr.sellThreshold = self.sets.maxSellThreshold;
            self.log(3, ['Sell threshold for %s reached maximum at %s%', curr.currency, self.sets.maxSellThreshold]);
        }
    }
}