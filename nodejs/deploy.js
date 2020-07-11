const aws = require('aws-sdk');
const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

const lambdaConfigPath = process.cwd() + '/lambda-config.json';
if (!fs.existsSync(lambdaConfigPath)) {
  console.log('lambda-config.jsonが存在しません。');
  process.exit(1);
}
const lambdaConfig = require(lambdaConfigPath);
const envName = process.argv[2];
const deployEnv = lambdaConfig.environments[envName];
const zipPath = 'pkg/' + path.basename(process.cwd()) + '.zip';

let optSilent = false;
let optNoRmZip = false;

function main() {
  if (process.argv.length < 3) {
    console.log('引数が不足しています。');
    console.log(`Usage: node deploy.js <環境名> [--verbose] [--no-rm-zip]`);
    process.exit(1);
  }
  if (!deployEnv) {
    console.log('環境名が不正です: "' + envName + '"');
    console.log('次のいずれかの値を設定してください: ' + JSON.stringify(Object.keys(lambdaConfig.environments)));
    process.exit(1);
  }

  let options = process.argv.slice(3);
  for (let option of options) {
    switch (option) {
      case '--silent': optSilent = true; break;
      case '--no-rm-zip': optNoRmZip = true; break;
    }
  }
  build();
  publish();
  if (optNoRmZip == false) {
    execSync(`rm -rf pkg`);
  }
}

function build() {
  let cmd = getZipCommand();
  if (!optSilent) {
    console.log(cmd);
  }
  let stdout = execSync(cmd).toString();
  if (!optSilent) {
    console.log(stdout);
  }
}

function getZipCommand() {
  let packageName = path.basename(process.cwd());
  let sourceFiles = _try(() => getConfig('zipFile').include) || ['*'];
  let excludePatterns = _try(() => getConfig('zipFile').exclude) || [];
  let cmd = 'rm -rf pkg && mkdir pkg && zip -r ' + zipPath + ' ' + sourceFiles.join(' ');
  excludePatterns.forEach(function(pattern) {
    cmd += " --exclude '" + pattern + "'";
  });
  return cmd;
}

function publish() {
  let proxy = process.env.https_proxy ? process.env.https_proxy : '';
  let lambda = new aws.Lambda({
    region: getConfig('region'),
    httpOptions: {proxy: proxy}
  });

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionCode-property
  let params = {
    FunctionName: deployEnv.functionName,
    ZipFile: fs.readFileSync(zipPath)
  };
  lambda.updateFunctionCode(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#updateFunctionConfiguration-property
      let configuration = {
        Description: getConfig('description'),
        FunctionName: getConfig('functionName'),
        Handler: (getConfig('handlerFile') != undefined && getConfig('handlerMethod') != undefined) ? getConfig('handlerFile') + '.' + getConfig('handlerMethod') : undefined,
        MemorySize: getConfig('memorySize'),
        Role: getConfig('role'),
        Runtime: getConfig('runtime'),
        Timeout: getConfig('timeout'),
        Environment: {
          Variables: getConfig('environment'),
        },
      };
      Object.keys(configuration).forEach(key => {
        if (configuration[key] === undefined) {
          delete configuration[key];
        }
      });
      lambda.updateFunctionConfiguration(configuration, function (err, data) {
        if (err) console.log(err, err.stack);
        else {
          if (!optSilent) {
            console.log(data);
            console.log('');
          }
          console.log(`デプロイ成功 [${envName}] ${configuration['FunctionName']}`); }
      });
    }
  });
}

function getConfig(key) {
  return (typeof(deployEnv[key]) != 'undefined') ? deployEnv[key] : lambdaConfig[key];
}

function _try(func, fallbackValue) {
  let value;
  try {
    value = func();
    return (value === null || value === undefined) ? fallbackValue : value;
  } catch (e) {
    return fallbackValue;
  }
}


if (typeof require != 'undefined' && require.main == module) {
  main();
}
