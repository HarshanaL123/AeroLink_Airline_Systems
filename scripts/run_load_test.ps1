$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "AeroLink Artillery Load Testing Suite" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

# 1. Ask the user for the ALB URL
$TargetUrl = Read-Host "Please enter the Target AWS ALB URL (e.g., http://k8s-aerolink...elb.amazonaws.com)"
if (-not $TargetUrl.StartsWith("http")) {
    $TargetUrl = "http://" + $TargetUrl
}

$env:TARGET_URL = $TargetUrl

Write-Host "`n[1/2] Simulating 100+ Concurrent Users bombarding the Cloud Architecture..." -ForegroundColor Cyan
Write-Host "Target: $TargetUrl" -ForegroundColor Gray

# 2. Run Artillery Load Test and generate JSON report
npx artillery run .\tests\load\booking-flow.yml --output .\tests\load\artillery-report.json

Write-Host "`n[2/2] Generating Beautiful HTML Performance Report..." -ForegroundColor Cyan
npx artillery report .\tests\load\artillery-report.json

Write-Host "`n✅ Load Test Complete! The HTML report has been generated at: .\tests\load\artillery-report.html" -ForegroundColor Magenta
Write-Host "Double-click this HTML file to open it in Chrome and view your latency and throughput graphs!" -ForegroundColor Green
