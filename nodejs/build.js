// https://qiita.com/imaifactory/items/ac81b4a3ff4a5f5dec85

var exec = require('child_process').exec,
  package = require(process.cwd() + '/package');

var COMMAND_PREFIX = 'rm -fr pkg; mkdir pkg; zip -r';

var target = package.name,
  main = '*.js',
  npm_dir = 'node_modules',
  excludes_str = '';

if (package.devDependencies && Object.keys(package.devDependencies).length > 0) {
  excludes_str = ' -x ';
  Object.keys(package.devDependencies).forEach(function (key) {
    excludes_str = excludes_str + build_exclude_str(key);
  });
}
exec(build_command_str(target, main, excludes_str), function (err, stdout, stderr) {
  if (err) console.log(err);
  console.log(stdout);
  console.log(stderr);
});

function build_exclude_str(key) {
  return npm_dir + '/' + key + '\\* ';
}

function build_command_str(target, main, excludes_str) {
  return COMMAND_PREFIX
    + ' pkg/' +
    target
    + '.zip ' +
    main
    + ' ' +
    npm_dir
    + excludes_str;
}
