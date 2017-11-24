const Sequelize = require('sequelize');
const PythonShell = require('python-shell');

let self;
module.exports = class Base {
  constructor() {
    self = this;
    process.once('SIGUSR2', self.shutdown); // for nodemon refresh
  }
  // log lvls:  3 - debug, 2 - verbose, 1 - errors, 0 - none
  log(lvl, msgArr, isStderr) {
    if (self.sets && self.sets.logLevel >= lvl) console[isStderr ? 'error' : 'log'](...msgArr);
  }
  // async/await helper
  to(promise) {
    if (promise && promise.then) {
      return promise
        .then(data => data)
        .catch(err => {
          self.log(1, [err], true);
          throw err
        });
    }
    return;
  }
  fixPrecision(n, digits) {
    let mult = (10 ** digits);
    if ((n + '').length > digits) {
      n = Math.floor(n * mult);
      return n / mult;
    }
    return n
  }
  runPython(scriptName) {
    return new Promise((resolve, reject) => {
      PythonShell.run(scriptName, function(err, result) {
        if (err) rejcet(err);
        resolve(result);
      });
    });

  }
  connectToDb(DB_URL) {
    return new Sequelize(DB_URL, { logging: false });
  }
  async shutdown() {
    self.log(2, ['\nStrating graceful shutdown...']);
    await self.to(self.disconnectDb());
    if (self.sendMarketsDataTimeout) clearTimeout(self.sendMarketsDataTimeout)
    self.closeWebsocket()
    self.closeWebServer()
    process.exit(0);
  }
  async closeWebServer() {
    if (self.app && self.app.close) {
      await self.app.close();
      self.log(2, ['Express server closed']);
    }
  }
  async closeWebsocket() {
    if (self.wss && self.wss.close) {
      await self.wss.close();
      self.log(2, ['WebSocket server closed']);
    }
  }
  async disconnectDb() {
    if (self.db && self.db.close) {
      self.log(2, ['Disconnecting database...']);
      return await self.to(self.db.close())
    }
    return;
  }


}
