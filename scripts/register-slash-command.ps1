$APP_ID   = $env:DISCORD_APP_ID
$TOKEN    = $env:DISCORD_BOT_TOKEN
$GUILD_ID = $env:DISCORD_GUILD_ID

$headers = @{ Authorization = "Bot $TOKEN"; "Content-Type" = "application/json" }
$baseUri = "https://discord.com/api/v10/applications/$APP_ID/guilds/$GUILD_ID/commands"

# コマンド定義
$body = @{
    name = "valo"; description = "VALORANTの募集を作成します"
    options = @(
        @{ type = 3; name = "start"; description = "開始時間"; required = $true },
        @{ type = 4; name = "need";  description = "募集人数"; required = $true; min_value = 1; max_value = 10 }
    )
} | ConvertTo-Json -Depth 10

# 1) 現在のコマンドを取得して該当のIDを探す
$existing = (Invoke-RestMethod -Uri $baseUri -Method GET -Headers $headers) | Where-Object { $_.name -eq "valo" }

# 2) IDがあれば PUT (更新)、なければ POST (新規) として実行
$method = if ($existing) { "PUT" } else { "POST" }
$targetUri = if ($existing) { "$baseUri/$($existing.id)" } else { $baseUri }

try {
    Write-Host "Method: $method ..."
    Invoke-RestMethod -Uri $targetUri -Method $method -Headers $headers -Body $body
}
catch {
    $_.Exception.Response.GetResponseStream() | ForEach-Object { (New-Object IO.StreamReader($_)).ReadToEnd() }
}
