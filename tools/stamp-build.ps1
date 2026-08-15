# Sella GF_BUILD en public/index.html con la fecha/hora del deploy (rompe la caché del navegador).
# OJO: siempre UTF-8 SIN BOM explícito — Get-Content/Set-Content de PowerShell 5 usan ANSI
# por defecto y rompen los acentos del archivo (pasó el 15/8: "ediciÃ³n").
$f = Join-Path $PSScriptRoot '..\public\index.html'
$v = Get-Date -Format 'yyyyMMdd-HHmm'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$txt = [System.IO.File]::ReadAllText($f, $utf8)
$txt = $txt -replace 'const GF_BUILD = "[^"]*";', ('const GF_BUILD = "' + $v + '";')
[System.IO.File]::WriteAllText($f, $txt, $utf8)
Write-Host ("GF_BUILD = " + $v)
