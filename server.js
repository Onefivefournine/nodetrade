const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const cors = require('cors');

const DB_URL = 'mysql://root:123@localhost:3306/testdb';
const sequelizeInstance = new Sequelize(DB_URL);
const chartData = require('./models/chartData.model')(sequelizeInstance);
const bbands = require('./models/bbands.model')(sequelizeInstance);

const app = express();
app.use(bodyParser.json());
app.use(cors());

const APP_PORT = 8888;

Promise.all([
chartData.sync(),
bbands.sync()
])
  .then(([chartData, bbands]) => {
    app.listen(APP_PORT, () => {
      console.log('Api is listening on http://localhost:' + APP_PORT);
    });
    let resp = {}
    app.get('/raw-data', (req, res) => {
      chartData.findAll({ limit: +req.query.limit || 15, offset: +req.query.offset || 0, order: ['date'] })
        .then((result) => {
          res.send(result)
        })
        .catch(err => { console.error(err) })
    });

    app.get('/bbands', (req, res) => {
      bbands.findAll({ limit: 1 })
        .then((result) => {
          res.send(result[0])
        })
        .catch(err => { console.error(err) })
    });

  })
  .catch(err => { console.error(err) })
