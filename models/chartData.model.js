const Sequelize = require('sequelize');
const moment = require('moment');

const chartData = (sequelizeInstance) => sequelizeInstance.define('chart_data', {
  id: { type: Sequelize.CHAR, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  date: Sequelize.DATE,
  high: Sequelize.FLOAT,
  low: Sequelize.FLOAT,
  open: Sequelize.FLOAT,
  close: Sequelize.FLOAT,
  volume: Sequelize.FLOAT,
  quoteVolume: Sequelize.FLOAT,
  weightedAverage: Sequelize.FLOAT,
  coinPair: Sequelize.STRING,
  createdAt: { type: Sequelize.DATE, defaultValue: moment() },
  period: Sequelize.INTEGER
}, {
  timestamps: false
});

module.exports = chartData;
