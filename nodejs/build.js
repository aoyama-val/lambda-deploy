var exec = require('child_process').exec;
var path = require('path');
var lambdaConfig = require(process.cwd() + '/lambda-config.json');

function build() {
  exec(buildZipCommand(), function (err, stdout, stderr) {
    if (err) console.log(err);
    console.log(stdout);
    console.log(stderr);
  });
}

function buildZipCommand() {
  var packageName = path.basename(process.cwd());
  var zipPath = 'pkg/' + packageName + '.zip';
  var sourceFiles = lambdaConfig.zipFile.include;
  var excludePatterns = lambdaConfig.zipFile.exclude;
  var cmd = 'mkdir -p pkg && zip -r ' + zipPath + ' ' + sourceFiles.join(' ');
  excludePatterns.forEach(function(pattern) {
    cmd += ' --exclude ' + pattern;
  });
  return cmd;
}

build();
