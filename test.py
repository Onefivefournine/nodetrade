#!/usr/bin/python
from poloniex import poloniex
import talib
import json
from datetime import datetime, timedelta
from time import mktime
import numpy
import sys

class calculate:
    def __init__(self,config):
        self.hasBuy = False
        self.profit = 0
        self.buyPrice = 0
        self.transactions = []
        self.config = config
        self.start()

    def getChartData(self):
        t = datetime.today() - timedelta(days=21)
        start = mktime(t.timetuple())

        return poloniex(self.config['api_key'],self.config['api_secret']).returnChartData({'currencyPair':self.config['currency_pair'],'start':start,'end':9999999999,'period':self.config['period']})

    def buyOrSell(self,lastbuff, isBuy):
        if (isBuy):
            self.buyPrice = round(lastbuff['close'] * self.config['invest_quantity'],8)
            self.profit = round(self.profit-self.buyPrice,8)
            # print('BUY')
            # print('buyPrice: %s' % self.buyPrice)
            # print('Overall profit: %s' % self.profit)
            self.hasBuy = True
        else:
            # diff = round((lastbuff['close'] - self.buyPrice) * self.config['invest_quantity'],8)
            self.profit = round(self.profit+lastbuff['close'] * self.config['invest_quantity'],8)
            # print('SELL')
            # print('Profit from current: %s' % diff)
            # print('Overall profit: %s' % self.profit)
            self.hasBuy = False

        self.transactions.append({
            'date': lastbuff['date'],
            'price': lastbuff['close'],
            'buyPrice': self.buyPrice,
            'investQuantity': self.config['invest_quantity'],
            'currency': self.config['currency_pair'],
            'profit':self.profit,
            'type':  'buy' if isBuy else 'sell'
        })


    def calc(self,buff):
        if len(buff) > 1:
            nparr = numpy.array(map(lambda x:x['close'], buff), dtype=float)
            upper, middle, lower = talib.BBANDS(nparr, timeperiod=21, nbdevup=2, nbdevdn=2, matype=0)
            rsi = talib.RSI(nparr, timeperiod=21)

            lastLowerBand = lower[-1]
            lastUpperBand = upper[-1]
            lastRsi = rsi[-1]
            lastbuff = buff[-1]

            # print(lastLowerBand, lastbuff['close'], lastUpperBand, lastRsi)

            if (
              lastLowerBand and
              lastRsi and
              lastbuff['close'] and
              (lastbuff['close'] > (lastUpperBand - self.config['upperBand_threshold']) or
              lastRsi < self.config['rsi_threshold']) and
              self.hasBuy
            ):
                  self.buyOrSell(lastbuff, False)
            elif (
              lastUpperBand and
              lastRsi and
              lastbuff['close'] and
              lastbuff['close'] < (lastLowerBand + self.config['lowerBand_threshold']) and
              not self.hasBuy
            ):
                self.buyOrSell(lastbuff, True)
        elif len(buff) == 1:
            self.buyOrSell(buff[0], False)
        else:
            print('NO_BUFFER_LENGTH')

    def start(self):
        data = self.getChartData()
        arrlen = range(len(data))

        for x in arrlen:
            self.calc(data)
            data.pop()

        print(json.dumps(self.transactions))

config = {
    'upperBand_threshold': 0.00005,
    'lowerBand_threshold': 0.00005,
    'invest_quantity':1,
    'api_secret':'',
    'api_key':'',
    'currency_pair':sys.argv[1] if len(sys.argv)>1 and sys.argv[1] else 'BTC_ETH',
    'rsi_threshold':sys.argv[2] if len(sys.argv)>2 and sys.argv[2] else 30,
    'period':sys.argv[3] if len(sys.argv)>3 and sys.argv[3] else 900,
}

calculate(config)

