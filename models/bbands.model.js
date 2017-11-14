const Sequelize = require('sequelize');
const moment = require('moment');

const bbands = (sequelizeInstance) => sequelizeInstance.define('bbands', {
  id: { type: Sequelize.CHAR, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  createdAt: { type: Sequelize.DATE, defaultValue: moment().toDate() },
  lowerBand: Sequelize.JSON,
  upperBand: Sequelize.JSON,
  middleBand: Sequelize.JSON,
  prices: Sequelize.JSON,
  dates: Sequelize.JSON
}, {
  timestamps: false
});

module.exports = bbands;
