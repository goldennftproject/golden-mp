# Sella GF_BUILD en public/index.html con la fecha/hora del deploy (rompe la caché del navegador)
$f = Join-Path $PSScriptRoot '..\public\index.html'
$v = Get-Date -Format 'yyyyMMdd-HHmm'
$txt = Get-Content $f -Raw
$txt = $txt -replace 'const GF_BUILD = "[^"]*";', ('const GF_BUILD = "' + $v + '";')
Set-Content -Path $f -Value $txt -NoNewline -Encoding UTF8
Write-Host ("GF_BUILD = " + $v)
