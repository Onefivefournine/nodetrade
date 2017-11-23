#!/usr/bin/python
from poloniex import poloniex
from talib.abstract import *
import json
from datetime import datetime, timedelta
from time import mktime
import numpy

t = datetime.today() - timedelta(days=21)
start = mktime(t.timetuple())

data = poloniex('','').returnChartData({'currencyPair':'BTC_ETH','start':start,'end':9999999999,'period':900})
inputs = numpy.array(map(lambda x: x['close'], data),dtype=float)

upper, middle, lower = BBANDS({'close':inputs},  timeperiod=21, nbdevup=2, nbdevdn=2, matype=0)
print(upper.tolist(), middle.tolist(), lower.tolist())