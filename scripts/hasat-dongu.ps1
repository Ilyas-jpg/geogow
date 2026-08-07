# Geogow — ülke geneli toplanma alanı hasadı, kendi kendine süren döngü.
#
# NEDEN VAR: hasat ~190.000 istek ve sunucu tarafı 0,5-1,8 istek/sn ile
# sınırlı — yani günler süren bir iş. Bu betik tek komutla başlatılır,
# arkada döner; her tur kontrol noktası yazdığı için bilgisayar kapansa
# bile kaldığı yerden devam eder.
#
# Kullanım (PowerShell, proje kökünde):
#     .\scripts\hasat-dongu.ps1
#     .\scripts\hasat-dongu.ps1 -TurDakika 45 -Isci 3
#
# Durdurmak: Ctrl+C. Kaldığı yerden sürmek için aynı komutu tekrar çalıştır.

param(
  [int]$TurDakika = 45,
  [int]$Isci = 1,
  [int]$Gecikme = 700,
  [int]$TurlarArasiSaniye = 20
)

$ErrorActionPreference = "Stop"
$kok = Split-Path -Parent $PSScriptRoot
Set-Location $kok

$gunlukDizin = Join-Path $kok "data\gunluk"
if (-not (Test-Path $gunlukDizin)) { New-Item -ItemType Directory -Path $gunlukDizin | Out-Null }
$gunluk = Join-Path $gunlukDizin ("hasat-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")

Write-Output "Geogow hasat dongusu basladi. Gunluk: $gunluk"
Write-Output "Tur suresi: $TurDakika dk - Isci: $Isci - Gecikme: $Gecikme ms - Durdurmak icin Ctrl+C"

$tur = 0
while ($true) {
  $tur++
  # Tamamlanmis il sayisi: data/ham/<plaka>.json yalniz tum ilceler bitince yazilir.
  $biten = @(Get-ChildItem -Path (Join-Path $kok "data\ham") -Filter "*.json" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.BaseName -match '^\d+$' }).Count

  Write-Output ""
  Write-Output ("=== Tur {0} - {1} - tamamlanan il: {2}/81 ===" -f $tur, (Get-Date -Format "HH:mm:ss"), $biten)

  if ($biten -ge 81) {
    Write-Output "Tum iller tamamlandi. Simdi: npm run derle  ve  npm run denetim"
    break
  }

  node scripts/toplanma-hasat.mjs --hepsi --isci=$Isci --gecikme=$Gecikme --sure=$TurDakika 2>&1 |
    Tee-Object -FilePath $gunluk -Append |
    Select-String -Pattern '✓|⏸|■|olcum|ölçüm|▶|KRITIK|KRİTİK' |
    ForEach-Object { $_.Line }

  if ($LASTEXITCODE -ne 0) {
    Write-Output "Hasat turu hata koduyla dondu ($LASTEXITCODE). 60 sn bekleyip yeniden denenecek."
    Start-Sleep -Seconds 60
  } else {
    Start-Sleep -Seconds $TurlarArasiSaniye
  }
}
