var proxy = process.env.https_proxy ? process.env.https_proxy : '';

var aws = require('aws-sdk'),
  fs = require('fs'),
  lambdaConfig = require(process.cwd() + '/lambda-config'),
  pkgConfig = require(process.cwd() + '/package');

var deployEnv = lambdaConfig.environments[process.env.DEPLOY];
if (!deployEnv) {
  console.log('環境変数 $DEPLOY が正しく設定されていません [', process.env.DEPLOY, ']');
  console.log('次のいずれかの値を設定してください: ' + Object.keys(lambdaConfig.environments).join(', '));
  process.exit(1);
}

var lambda = new aws.Lambda({
  region: lambdaConfig.region,
  httpOptions: {proxy: proxy}
});
var zipPath = 'pkg/' + pkgConfig.name + '.zip';

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
      Description: lambdaConfig.description,
      FunctionName: deployEnv.functionName,
      Handler: buildHandlerName(lambdaConfig),
      MemorySize: lambdaConfig.memorySize,
      Role: lambdaConfig.role,
      Runtime: lambdaConfig.runtime,
      Timeout: lambdaConfig.timeout,
      Environment: { Variables: { LAMBDA_ENV: process.env.DEPLOY } },
    };
    lambda.updateFunctionConfiguration(configuration, function (err, data) {
      if (err) console.log(err, err.stack);
      else console.log(data);
    });
  }
});

function buildHandlerName(lambdaConfig) {
  return lambdaConfig.handlerFile + '.' + lambdaConfig.handlerMethod;
}
