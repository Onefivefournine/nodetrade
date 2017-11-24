const WebSocket = require('ws');
const Sequelize = require('sequelize');
const axios = require('axios');
const Talib = require('talib');
const moment = require('moment');
const dbConfig = require('./dbConfig');

// frontend
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const webpackRunner = require('./frontend/webpack-runner.js');

// models

const CalculationMixin = require('./calculate');
const Base = require('./base');

const DB_URL = `mysql://${dbConfig.user}${dbConfig.password?':'+dbConfig.password:''}@${dbConfig.host}:${dbConfig.port}/${dbConfig.name}`;
const FRONTEND_PATH = path.resolve(__dirname, 'frontend/build');
const WEBSOCKET_PORT = 2222;
const APP_PORT = 4242;

function _now() {
  return `(${moment().format('DD.MM.YYYY HH:mm:ss')})`;
}

let self;
class Trader extends CalculationMixin(Base) {
  constructor() {
    super();
    self = this;

    self.chartDataModel = require('./models/chartData.model')(self.db);
    self.transactionModel = require('./models/transaction.model')(self.db);
    self.talibData = require('./models/talibData.model')(self.db);
    self.settings = require('./models/settings.model')(self.db);

    self.start()
  }
  start() {
    self.sendMarketsDataTimeout = null;
    // self.startFrontend(); // comment this if you want to use other frontend server (e.g webpack-dev-server)
    self.startServer();
  }
  async startServer() {
    await self.to(self.connectToDb(DB_URL));
    self.sets = await self.to(self.settings.findOrCreate());
    self.initExecution()
    await self.to(self.connectWebSocket());
  }
  async initExecution() {
    self.script = await self.to(self.runPython('getMarketsData.py'));
    self.script.on('message', function(msg) {
      console.log('test', msg);
    })
  }
  startFrontend() {
    if (!fs.existsSync(FRONTEND_PATH)) {
      self.log(2, ['Strating frontend build...']);
      webpackRunner()
        .then(() => { self.startWebServer() })
        .catch((err) => {
          self.log(1, ['Error occured while building frontend', err], true);
        });
    } else {
      self.startWebServer()
    }
  }
  startWebServer() {
    self.app = express();
    self.app.use(bodyParser.json());

    self.app.listen(APP_PORT, () => {
      self.log(2, ['Frontend is served on http://localhost:' + APP_PORT + '/frontend']);
    });

    self.app.use('/', express.static(FRONTEND_PATH));
    self.app.use('*', express.static(FRONTEND_PATH + '/index.html'));
  }

  wsSend(type, msg) {
    if (self.ws && self.ws.readyState === 1) {
      let dataToSend = JSON.stringify({ type: 'SERVER::' + type, data: msg });
      self.log(2, ['Sending message with type %s, content length: %s %s', type, dataToSend.length, _now()]);
      self.ws.send(dataToSend);
    }
  }

  connectWebSocket() {
    self.wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
    return new Promise((resolve, reject) => {
      self.log(2, ['Waiting for WebSocket connections...']);
      self.wss.on('connection', function(ws) {
        self.log(2, ['WebSocket client connected', _now()]);
        self.ws = ws;

        self.ws.on('message', self.messageHandler);

        self.ws.on('close', () => {
          // clearTimeout(self.sendMarketsDataTimeout)
          self.log(2, ['WebSocket client disconnected', _now()]);
        })

        resolve(self.ws)
      });
    })
  }
  messageHandler(message) {
    let parsedMsg = JSON.parse(message)
    self.log(2, ['Received message with type %s, content length: %s %s', parsedMsg.type, message.length, _now()]);
    switch (parsedMsg.type) {
      case 'CLIENT::getSettings':
        self.wsSend('settings', self.sets)
        break;
      case 'CLIENT::setSettings':
        self.setSettingsHandler(parsedMsg.data);
        break;
      case 'CLIENT::getMarketsData':
        self.wsSend('marketsData', self.previousCoinData);
        self.wsSend('marketsData', self.currentCoinData);
        self.wsSend('settings', self.sets);
        break;
      default:
        self.log(1, ['Received undefined command!', parsedMsg], true)
        self.wsSend('error', { message: 'Undefined command!' })
    }
  }

  async setSettingsHandler(data) {
    let sets = self.settings.findOne({});
    sets.update({ data })
      .then((result) => {
        self.wsSend('settings', result);
        self.settings = result
      }).catch((err) => {
        self.wsSend('error', err);
      });
  }
}

const TraderInstance = new Trader();
