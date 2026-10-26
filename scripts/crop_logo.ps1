Add-Type -AssemblyName System.Drawing
$imgPath = Resolve-Path "public/logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
Write-Host "Original Size: $($bmp.Width) x $($bmp.Height)"

$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y += 2) {
    for ($x = 0; $x -lt $bmp.Width; $x += 2) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -gt 30 -and ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Bounding box: minX=$minX, minY=$minY, maxX=$maxX, maxY=$maxY"
$contentW = $maxX - $minX
$contentH = $maxY - $minY
Write-Host "Content Size: $contentW x $contentH"

if ($contentW -gt 50 -and $contentH -gt 50) {
    # Add a small padding of 15px around the logo
    $pad = 15
    $cropX = [Math]::Max(0, $minX - $pad)
    $cropY = [Math]::Max(0, $minY - $pad)
    $cropW = [Math]::Min($bmp.Width - $cropX, $contentW + ($pad * 2))
    $cropH = [Math]::Min($bmp.Height - $cropY, $contentH + ($pad * 2))
    
    $rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
    $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
    
    # Save backup of original
    Copy-Item "public/logo.png" "public/logo_original_square.png" -Force
    $bmp.Dispose()
    
    $cropped.Save((Resolve-Path "public/logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "Successfully cropped logo to $cropW x $cropH and saved to public/logo.png!"
} else {
    $bmp.Dispose()
    Write-Host "Could not determine bounding box reliably."
}
