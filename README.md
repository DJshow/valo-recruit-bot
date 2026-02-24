# valo-recruit-bot

AWS Lambda + API Gateway + DynamoDB を使用したサーバーレス構成のDiscord Botです。

Discord上でVALORANTの募集を作成し、参加人数と参加者一覧をリアルタイムで管理できるBotです。  
参加・取消・募集終了をボタン操作で行うことができ、募集状況を一目で把握できます。  
AWS Lambda と DynamoDB を使用したサーバーレス構成で実装しています。

---

## Features

- `/valo` コマンドで募集メッセージを作成
- ボタン操作で「参加」「参加取消」「募集終了」が可能
- 参加者一覧と残り人数をリアルタイム更新
- 募集データを DynamoDB に保存
- サーバーレス構成のため、サーバー管理不要

---

## Architecture


Discord
↓
API Gateway (HTTP API)
↓
AWS Lambda (Node.js)
↓
DynamoDB


---

## Setup

### Discord 側

1. Discord Developer Portal で Application を作成
2. Bot を作成し、Token を取得（※公開しない）
3. Public Key を取得
4. Bot をサーバーに追加（applications.commands, bot）
5. Interactions Endpoint URL に API Gateway の URL を設定

---

### AWS 側

1. DynamoDB テーブル作成

テーブル名例：

valo-recruit


パーティションキー：

recruitId (String)


2. Lambda 関数作成（Node.js）

環境変数：


DISCORD_PUBLIC_KEY
TABLE_NAME


3. API Gateway 作成


POST /interactions


を Lambda に統合

---

## Slash Command 登録（PowerShell）

環境変数を設定：

```powershell
$env:DISCORD_APP_ID="your_app_id"
$env:DISCORD_BOT_TOKEN="your_bot_token"
$env:DISCORD_GUILD_ID="your_guild_id"

実行：

.\scripts\register-slash-command.ps1
Usage

Discordで以下を実行：

/valo start:21:00 need:5

募集メッセージが作成されます。

例：

VALORANT募集
開始時間：21:00

参加者（0/5）

募集者：sho
状態：募集中

ボタン：

参加

参加取消

募集終了

Security Notes（重要）

以下は絶対にGitHubに公開しないでください：

Bot Token

Discord Public Key

AWSアクセスキー

環境変数ファイル (.env)

公開してしまった場合は、必ずTokenをリセットしてください。

Purpose

DiscordでのVALORANT募集において、

現在の参加人数が分からない

誰が参加しているか分からない

あと何人募集できるか分からない

という課題を解決するために作成しました。

Tech Stack

Discord Interaction API

AWS Lambda (Node.js)

Amazon API Gateway

Amazon DynamoDB

PowerShell

Author

sho
