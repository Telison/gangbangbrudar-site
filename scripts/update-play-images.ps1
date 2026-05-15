$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$imageDir = Join-Path $repoRoot "assets/images/gallery"
$manifestPath = Join-Path $imageDir "images.js"
$extensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")

$files = Get-ChildItem -LiteralPath $imageDir -File |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object @{
        Expression = {
            if ($_.BaseName -match "^\d+$") {
                [int]$_.BaseName
            } else {
                [int]::MaxValue
            }
        }
    }, Name |
    Select-Object -ExpandProperty Name

$lines = @("window.playImages = [")

for ($i = 0; $i -lt $files.Count; $i++) {
    $escapedName = $files[$i].Replace("\", "\\").Replace('"', '\"')
    $comma = if ($i -lt $files.Count - 1) { "," } else { "" }
    $lines += "    `"$escapedName`"$comma"
}

$lines += "];"

Set-Content -LiteralPath $manifestPath -Value $lines -Encoding UTF8
Write-Host "Updated $manifestPath with $($files.Count) image(s)."
