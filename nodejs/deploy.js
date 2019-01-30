var aws = require('aws-sdk');
var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');

var lambdaConfig = require(process.cwd() + '/lambda-config.json');
var deployEnv = lambdaConfig.environments[process.env.DEPLOY];
var zipPath = 'pkg/' + path.basename(process.cwd()) + '.zip';

function main() {
  var args = process.argv.slice(2);
  if (args.length == 0) {
    build();
    publish();
  } else {
    process.argv.forEach(function(arg) {
      switch (arg) {
        case 'build':
          build();
          break;
        case 'publish':
          publish();
          break;
      }
    });
  }
}

function build() {
  var cmd = getZipCommand();
  console.log(cmd);
  console.log(execSync(cmd).toString());
}

function getZipCommand() {
  var packageName = path.basename(process.cwd());
  var sourceFiles = _try(() => getConfig('zipFile').include) || [];
  var excludePatterns = _try(() => getConfig('zipFile').exclude) || [];
  var cmd = 'rm -rf pkg && mkdir pkg && zip -r ' + zipPath + ' ' + sourceFiles.join(' ');
  excludePatterns.forEach(function(pattern) {
    cmd += " --exclude '" + pattern + "'";
  });
  return cmd;
}

function publish() {
  if (!deployEnv) {
    console.log('環境変数 $DEPLOY が正しく設定されていません [', process.env.DEPLOY, ']');
    console.log('次のいずれかの値を設定してください: ' + Object.keys(lambdaConfig.environments).join(', '));
    process.exit(1);
  }

  var proxy = process.env.https_proxy ? process.env.https_proxy : '';
  var lambda = new aws.Lambda({
    region: getConfig('region'),
    httpOptions: {proxy: proxy}
  });

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionCode-property
  var params = {
    FunctionName: deployEnv.functionName,
    ZipFile: fs.readFileSync(zipPath)
  };
  lambda.updateFunctionCode(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionConfiguration-property
      var configuration = {
        Description: getConfig('description'),
        FunctionName: getConfig('functionName'),
        Handler: getConfig('handlerFile') + '.' + getConfig('handlerMethod'),
        MemorySize: getConfig('memorySize'),
        Role: getConfig('role'),
        Runtime: getConfig('runtime'),
        Timeout: getConfig('timeout'),
        Environment: { Variables: { LAMBDA_ENV: process.env.DEPLOY } },
      };
      lambda.updateFunctionConfiguration(configuration, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log(data);
      });
    }
  });
}

function getConfig(key) {
  return (typeof(deployEnv[key]) != 'undefined') ? deployEnv[key] : lambdaConfig[key];
}

function _try(func, fallbackValue) {
  try {
    var value = func();
    return (value === null || value === undefined) ? fallbackValue : value;
  } catch (e) {
    return fallbackValue;
  }
}


if (typeof require != 'undefined' && require.main == module) {
  main();
}
