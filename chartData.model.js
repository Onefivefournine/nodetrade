const Sequelize = require('sequelize');

const chartData = (sqlz) => sqlz.define('chart_data', {
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
  createdAt: Sequelize.DATE,
  period: Sequelize.INTEGER
}, {
  timestamps: false
});

module.exports = chartData;
