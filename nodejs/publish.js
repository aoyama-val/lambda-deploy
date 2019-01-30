var aws = require('aws-sdk');
var fs = require('fs');
var path = require('path');
var lambdaConfig = require(process.cwd() + '/lambda-config.json');
var deployEnv = lambdaConfig.environments[process.env.DEPLOY];

function publish() {
  if (!deployEnv) {
    console.log('環境変数 $DEPLOY が正しく設定されていません [', process.env.DEPLOY, ']');
    console.log('次のいずれかの値を設定してください: ' + Object.keys(lambdaConfig.environments).join(', '));
    process.exit(1);
  }

  var proxy = process.env.https_proxy ? process.env.https_proxy : '';
  var lambda = new aws.Lambda({
    region: lambdaConfig.region,
    httpOptions: {proxy: proxy}
  });
  var zipPath = 'pkg/' + path.basename(process.cwd()) + '.zip';

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

publish();
