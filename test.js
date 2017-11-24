const PythonShell = require('python-shell');

PythonShell.run('test.py', { args: ['BTC_ETH'] }, function(err, result) {
  if (err) throw err;
  console.log(result);
});
