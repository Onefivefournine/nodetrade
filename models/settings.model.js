const Sequelize = require('sequelize');
const moment = require('moment');

const settings = (sequelizeInstance) => sequelizeInstance.define('settings', {
  currency_pair: { type: Sequelize.STRING, default: "BTC_ETH" },
  invest_quantity: { type: Sequelize.FLOAT, default: 0.1 },
  start_date: moment().subtract(21, 'days').unix(),
  end_date: 9999999999,
  period: 900, // 300, 900, 1800, 7200, 14400, or 86400
  rsi_threshold: 40,
  lowerBand_threshold: 0.00005,
  upperBand_threshold: 0.00005,
}, {
  timestamps: false
});

module.exports = settings;
