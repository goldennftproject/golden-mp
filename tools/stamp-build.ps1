# Sella GF_BUILD en public/index.html con la fecha/hora del deploy (rompe la caché del navegador).
# OJO: siempre UTF-8 SIN BOM explícito — Get-Content/Set-Content de PowerShell 5 usan ANSI
# por defecto y rompen los acentos del archivo (pasó el 15/8: "ediciÃ³n").
$f = Join-Path $PSScriptRoot '..\public\index.html'
# 24/8: con SEGUNDOS. Desde que los .js se sirven con "immutable" (un año de caché, sin
# revalidar), el sello es lo ÚNICO que le avisa al navegador que hay código nuevo. Con
# resolución de minuto, dos deploys seguidos dentro del mismo minuto —que pasa, y bastante—
# compartían sello: el segundo no llegaba a nadie que ya hubiera cargado el primero.
$v = Get-Date -Format 'yyyyMMdd-HHmmss'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$txt = [System.IO.File]::ReadAllText($f, $utf8)
$txt = $txt -replace 'const GF_BUILD = "[^"]*";', ('const GF_BUILD = "' + $v + '";')
[System.IO.File]::WriteAllText($f, $txt, $utf8)
Write-Host ("GF_BUILD = " + $v)
