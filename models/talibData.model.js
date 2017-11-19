const Sequelize = require('sequelize');
const moment = require('moment');

const talibData = (sequelizeInstance) => sequelizeInstance.define('talibData', {
    id: { type: Sequelize.STRING, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    createdAt: { type: Sequelize.DATE, defaultValue: moment().toDate() },
    data: Sequelize.JSON,
    type: Sequelize.STRING
}, {
    timestamps: false
});

module.exports = talibData;