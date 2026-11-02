param([ValidateSet('bot.mjs','configure-server.mjs','audit-server.mjs','prepare-alpha.mjs','verify-alpha.mjs','audit-roles.mjs','audit-content.mjs','refresh-alpha.mjs','publish-alpha-event.mjs','inspect-alpha-art.mjs','notify-reopening-20261101.mjs','inspect-mentions.mjs','verify-discord-link.mjs')][string]$BotEntry = 'bot.mjs')
$ErrorActionPreference = 'Stop'
$botSecretDir = Join-Path $env:LOCALAPPDATA 'GoldenFarmDiscord'
$botEncrypted = Get-Content -LiteralPath (Join-Path $botSecretDir 'discord-token.dpapi') | ConvertTo-SecureString
$botCredential = New-Object System.Net.NetworkCredential('', $botEncrypted)
$env:DISCORD_TOKEN = $botCredential.Password
try {
    Set-Location -LiteralPath $PSScriptRoot
    & 'C:\Program Files\nodejs\node.exe' $BotEntry
} finally {
    Remove-Item Env:DISCORD_TOKEN -ErrorAction SilentlyContinue
}
