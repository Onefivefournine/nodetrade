const mysql = require('mysql');
const axios = require('axios');
const talib = require('talib');
const moment = require('moment');


const CURRENCY_PAIR = 'BTC_XMR';
const START = moment().subtract(21, 'days').unix();
const END = moment().unix();
// 300, 900, 1800, 7200, 14400, or 86400
const PERIOD = 86400;

console.log(START, END);
// axios.get(`https://poloniex.com/public?command=returnChartData&currencyPair=${CURRENCY_PAIR}&start=${START}&end=${END}&period=${PERIOD}`)
//   .then((data) => {

//   })
//   .catch((err) => console.error(err))


// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '123',
//   database: 'testdb'
// });

// connection.connect();

// connection.query('SELECT 1 + 1 AS solution', function(error, results, fields) {
//   if (error) throw error;
//   console.log('The solution is: ', results[0].solution);
// });

// connection.end();
