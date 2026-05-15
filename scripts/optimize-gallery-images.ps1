$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$imageDir = Join-Path $repoRoot "assets/images/gallery"
$sourceExtensions = @(".jpg", ".jpeg", ".png")

$magickCommand = Get-Command magick -ErrorAction SilentlyContinue
$magick = if ($magickCommand) {
    $magickCommand.Source
} else {
    "C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"
}

if (-not (Test-Path -LiteralPath $magick)) {
    throw "ImageMagick was not found. Install it with: winget install --id ImageMagick.ImageMagick --exact"
}

$files = Get-ChildItem -LiteralPath $imageDir -File |
    Where-Object { $sourceExtensions -contains $_.Extension.ToLowerInvariant() }

foreach ($file in $files) {
    $output = Join-Path $file.DirectoryName ($file.BaseName + ".webp")
    & $magick $file.FullName -auto-orient -strip -resize "1600x1600>" -quality 82 $output

    if (-not (Test-Path -LiteralPath $output)) {
        throw "Failed to create $output"
    }

    Remove-Item -LiteralPath $file.FullName -Force
}

& (Join-Path $PSScriptRoot "update-gallery-images.ps1")
