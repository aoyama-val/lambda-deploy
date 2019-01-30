# デプロイ方法

deploy.jsとlambda-config.jsonをプロジェクトのディレクトリにコピーする
（deploy.jsは別のディレクトリにあっても構わないが、lambda-config.jsonはプロジェクトのディレクトリに置かなければならない）

下記ファイルの中を書き換えてから実行すること:

- lambda-config.json

`role` の arn は下記コマンドでわかる

```
$ aws lambda get-function --function-name 関数名
```

実行:

```
$ DEPLOY=production node deploy.js
```
