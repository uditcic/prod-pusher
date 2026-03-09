# scripts/make-icon.ps1
# Rebuilds assets/icon.ico with all four Windows-required sizes (16, 32, 48, 256).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\make-icon.ps1 [source-image]
# source-image defaults to assets\icon.ico if not provided.

param([string]$Source = "assets\icon.ico")

Add-Type -AssemblyName System.Drawing

$outPath = "assets\icon.ico"
$sizes   = @(16, 32, 48, 256)

# Load source (supports .ico, .png, .jpg, .bmp)
try {
    if ($Source -match '\.ico$') {
        $icon = New-Object System.Drawing.Icon($Source)
        $src  = $icon.ToBitmap()
    } else {
        $src = [System.Drawing.Image]::FromFile((Resolve-Path $Source).Path)
    }
} catch {
    Write-Error "Could not load source image: $_"; exit 1
}

# Render each size as a PNG byte array
$images = foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    [PSCustomObject]@{ Size = $size; Data = $ms.ToArray() }
    $ms.Dispose()
}
$src.Dispose()

# --- Write ICO binary ---
# Header: reserved(2) + type=1(2) + count(2)
$out = New-Object System.IO.MemoryStream
$header = [byte[]](0,0, 1,0, [byte]$images.Count, 0)
$out.Write($header, 0, 6)

# Directory entries (16 bytes each), then image blobs
$offset = 6 + (16 * $images.Count)
foreach ($img in $images) {
    # width/height: 0 means 256 in ICO spec
    $w = if ($img.Size -eq 256) { 0 } else { [byte]$img.Size }
    $h = if ($img.Size -eq 256) { 0 } else { [byte]$img.Size }
    $len = $img.Data.Length
    $entry = [byte[]](
        $w, $h, 0, 0,   # width, height, colours, reserved
        1, 0,            # colour planes
        32, 0,           # bits per pixel
        ($len -band 0xFF), (($len -shr 8) -band 0xFF), (($len -shr 16) -band 0xFF), (($len -shr 24) -band 0xFF),
        ($offset -band 0xFF), (($offset -shr 8) -band 0xFF), (($offset -shr 16) -band 0xFF), (($offset -shr 24) -band 0xFF)
    )
    $out.Write($entry, 0, 16)
    $offset += $len
}
foreach ($img in $images) { $out.Write($img.Data, 0, $img.Data.Length) }

[System.IO.File]::WriteAllBytes((Join-Path (Get-Location) $outPath), $out.ToArray())
Write-Host "Done. $outPath rebuilt with sizes: $($sizes -join ', ')"
