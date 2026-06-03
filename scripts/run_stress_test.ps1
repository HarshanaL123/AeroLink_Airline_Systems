$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "AeroLink Artillery Stress Testing Suite (Breaking Point)" -ForegroundColor Red
Write-Host "========================================================" -ForegroundColor Yellow

# 1. Ask the user for the ALB URL
$TargetUrl = Read-Host "Please enter the Target AWS ALB URL (e.g., http://k8s-aerolink...elb.amazonaws.com)"
if (-not $TargetUrl.StartsWith("http")) {
    $TargetUrl = "http://" + $TargetUrl
}

$env:TARGET_URL = $TargetUrl

Write-Host "`n[1/2] Simulating EXTREME 500+ Concurrent Users bombarding the Cloud Architecture..." -ForegroundColor Cyan
Write-Host "Target: $TargetUrl" -ForegroundColor Gray
Write-Host "WARNING: This will push the cluster to its absolute breaking point." -ForegroundColor Red

# 2. Ask user for secret API key for Artillery Cloud
$ApiKey = Read-Host "Please enter your Artillery Cloud API Key (or press Enter to skip cloud recording)"

if ($ApiKey -eq "") {
    Write-Host "Skipping Cloud Recording... Generating local JSON only." -ForegroundColor Gray
    npx artillery run .\tests\load\stress-test.yml --output .\tests\load\stress-report.json
} else {
    Write-Host "Recording to Artillery Cloud..." -ForegroundColor Cyan
    npx artillery run .\tests\load\stress-test.yml --record --key $ApiKey
}

Write-Host "`n✅ Stress Test Complete! If you skipped cloud recording, the raw JSON is at .\tests\load\stress-report.json" -ForegroundColor Magenta
Write-Host "Check your Artillery Cloud dashboard to view the exact moment your servers started dropping connections!" -ForegroundColor Green
