const Sequelize = require('sequelize');
const moment = require('moment');

const bbands = (sequelizeInstance) => sequelizeInstance.define('bbands', {
  id: { type: Sequelize.CHAR, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  createdAt: { type: Sequelize.DATE, defaultValue: moment().toDate() },
  lowerBand: Sequelize.TEXT,
  upperBand: Sequelize.TEXT,
  middleBand: Sequelize.TEXT,
  prices: Sequelize.TEXT,
  dates: Sequelize.TEXT,
  rsi: Sequelize.TEXT
}, {
  timestamps: false
});

module.exports = bbands;
