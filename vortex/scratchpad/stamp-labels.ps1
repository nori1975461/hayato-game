# Draw labels (any language) onto PNGs via System.Drawing. Node design scripts have no font, so this runs after them.
#   usage: powershell -NoProfile -ExecutionPolicy Bypass -File stamp-labels.ps1 -JsonPath <labels.json>
#   labels.json = [{ file, items: [{ x, y, text, size }] }] in UTF-8. Keep this .ps1 ASCII only (PowerShell 5.1 reads BOM-less files as ANSI).
param([Parameter(Mandatory = $true)][string]$JsonPath)
Add-Type -AssemblyName System.Drawing
$list = [IO.File]::ReadAllText((Resolve-Path $JsonPath).Path, [Text.Encoding]::UTF8) | ConvertFrom-Json
foreach ($f in $list) {
  $src = New-Object System.Drawing.Bitmap($f.file)
  $img = New-Object System.Drawing.Bitmap($src)
  $src.Dispose()
  $g = [System.Drawing.Graphics]::FromImage($img)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  foreach ($it in $f.items) {
    $font = New-Object System.Drawing.Font('Yu Gothic UI', [single]$it.size)
    $g.DrawString([string]$it.text, $font, [System.Drawing.Brushes]::White, [single]$it.x, [single]$it.y)
    $font.Dispose()
  }
  $g.Dispose()
  $img.Save($f.file, [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose()
  Write-Output ("stamped " + [IO.Path]::GetFileName($f.file))
}
