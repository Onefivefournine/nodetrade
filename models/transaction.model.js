const Sequelize = require('sequelize');
const moment = require('moment');
let i = 0;
let now = moment().unix();
const transaction = (sequelizeInstance) => sequelizeInstance.define('transaction', {
  id: { type: Sequelize.CHAR, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  created: {
    type: Sequelize.STRING,
    defaultValue() {
      i++;
      return now + '_' + (i < 10 ? '00' + i : (i < 100 && i >= 10) ? '0' + i : i)
    }
  },
  investQuantity: Sequelize.FLOAT,
  profit: Sequelize.FLOAT,
  price: Sequelize.FLOAT,
  type: Sequelize.STRING,
  currency: Sequelize.STRING,
}, {
  createdAt: false,
  updatedAt: false,
  timestamps: false
});

module.exports = transaction;
