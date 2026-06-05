$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$TempDir = Join-Path $Root ".tmp-postal-codes"
$ZipPath = Join-Path $TempDir "DE.zip"
$ExtractDir = Join-Path $TempDir "extract"
$TxtPath = Join-Path $ExtractDir "DE.txt"
$CsvPath = Join-Path $Root "prisma\postal_codes_de_full.csv"

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
New-Item -ItemType Directory -Force -Path $ExtractDir | Out-Null

Write-Host "Downloading full Germany postal codes from GeoNames..."
Invoke-WebRequest -Uri "https://download.geonames.org/export/zip/DE.zip" -OutFile $ZipPath

Write-Host "Extracting..."
if (Test-Path $ExtractDir) { Remove-Item -Recurse -Force $ExtractDir }
New-Item -ItemType Directory -Force -Path $ExtractDir | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force

if (!(Test-Path $TxtPath)) {
  throw "DE.txt not found after extracting DE.zip"
}

Write-Host "Converting DE.txt to CSV..."
"code,city,state,latitude,longitude" | Set-Content -Encoding UTF8 $CsvPath

Get-Content $TxtPath -Encoding UTF8 | ForEach-Object {
  if ([string]::IsNullOrWhiteSpace($_)) { return }

  $p = $_ -split "`t"
  if ($p.Length -lt 12) { return }

  $code = $p[1]
  $city = $p[2]
  $state = $p[3]
  $lat = $p[9]
  $lon = $p[10]

  if ($code -match '^\d{5}$' -and $city -and $lat -and $lon) {
    $cityEsc = '"' + ($city -replace '"','""') + '"'
    $stateEsc = '"' + ($state -replace '"','""') + '"'
    "$code,$cityEsc,$stateEsc,$lat,$lon" | Add-Content -Encoding UTF8 $CsvPath
  }
}

Write-Host "Created $CsvPath"
Write-Host "Importing into database..."
node (Join-Path $Root "scripts\import-postal-codes.mjs") $CsvPath
