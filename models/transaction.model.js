const Sequelize = require('sequelize');
const moment = require('moment');

const transaction = (sequelizeInstance) => sequelizeInstance.define('transaction', {
  id: { type: Sequelize.CHAR, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  createdAt: { type: Sequelize.DATE, defaultValue: moment() },
  amount: Sequelize.FLOAT,
  type: Sequelize.STRING,
  currency: Sequelize.STRING,
}, {
  timestamps: false
});

module.exports = transaction;
