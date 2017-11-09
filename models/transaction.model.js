const Sequelize = require('sequelize');

const chartData = (sequelizeInstance) => sequelizeInstance.define('chart_data', {
  id: { type: Sequelize.CHAR, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  createdAt: Sequelize.DATE,
  amount: Sequelize.FLOAT,
  currency: Sequelize.STRING,

}, {
  timestamps: false
});

module.exports = chartData;
