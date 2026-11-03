param([ValidateSet('bot.mjs','configure-server.mjs','audit-server.mjs','prepare-alpha.mjs','verify-alpha.mjs','audit-roles.mjs','audit-content.mjs','refresh-alpha.mjs','publish-alpha-event.mjs','inspect-alpha-art.mjs','notify-reopening-20261101.mjs','inspect-mentions.mjs','verify-discord-link.mjs')][string]$BotEntry = 'bot.mjs')
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Desktop') {
    # Un proceso iniciado desde PowerShell 7 puede heredar sus módulos: cargar primero los de Windows.
    $env:PSModulePath = $PSHOME + '\Modules;' + [Environment]::GetEnvironmentVariable('PSModulePath', 'Machine')
}
$botMutex = $null
if ($BotEntry -eq 'bot.mjs') {
    $botMutex = New-Object System.Threading.Mutex($false, 'Local\GoldenFarmDiscordBot')
    if (-not $botMutex.WaitOne(0)) { $botMutex.Dispose(); Write-Output 'Golden Farm bot ya está activo.'; exit 0 }
}
$botSecretDir = Join-Path $env:LOCALAPPDATA 'GoldenFarmDiscord'
$botEncrypted = Get-Content -LiteralPath (Join-Path $botSecretDir 'discord-token.dpapi') | ConvertTo-SecureString
$botCredential = New-Object System.Net.NetworkCredential('', $botEncrypted)
$env:DISCORD_TOKEN = $botCredential.Password
try {
    Set-Location -LiteralPath $PSScriptRoot
    do {
        & 'C:\Program Files\nodejs\node.exe' (Join-Path $PSScriptRoot $BotEntry)
        if ($BotEntry -ne 'bot.mjs' -or $LASTEXITCODE -eq 0) { break }
        Write-Output ((Get-Date -Format o) + ' Golden Farm bot detenido; reintento en 30 s.')
        Start-Sleep -Seconds 30
    } while ($true)
} finally {
    Remove-Item Env:DISCORD_TOKEN -ErrorAction SilentlyContinue
    if ($botMutex) { try { $botMutex.ReleaseMutex() } catch {}; $botMutex.Dispose() }
}
