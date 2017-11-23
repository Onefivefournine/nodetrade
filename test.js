const PythonShell = require('python-shell');

PythonShell.run('test.py', function(err, result) {
  if (err) throw err;
  console.log(result);
});
