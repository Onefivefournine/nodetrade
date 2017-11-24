module.exports = function() {
  const webpack = require('webpack');
  const wpConfig = require('./webpack.config')
  const ProgressPlugin = require('webpack/lib/ProgressPlugin');

  const compiler = webpack(wpConfig({ env: { NODE_ENV: 'production' } }));

  compiler.apply(new ProgressPlugin(function(percentage, msg) {
    console.log((percentage * 100).toFixed(2) + '%', msg);
  }));

  return new Promise((resolve, reject) => {
    compiler.run(function(err, stats) {
      if (err) reject(err)
      resolve(stats);
    });
  })
}
