$ErrorActionPreference = "Stop"
$RegionUS = "us-east-1"
$RegionEU = "eu-west-1"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Redeploying ALL Microservices Globally" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow

# 1. Get AWS Account ID (Trim to remove Windows carriage returns)
$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()

# 2. Authenticate Docker to ECR
Write-Host "`nAuthenticating Docker to AWS ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $RegionUS | docker login --username AWS --password-stdin "${AccountId}.dkr.ecr.${RegionUS}.amazonaws.com"
aws ecr get-login-password --region $RegionEU | docker login --username AWS --password-stdin "${AccountId}.dkr.ecr.${RegionEU}.amazonaws.com"

# 3. Define Services
$Services = @("auth-service", "flight-service", "booking-service", "baggage-service")

foreach ($Service in $Services) {
    Write-Host "`n---> Processing $Service <---" -ForegroundColor Magenta
    
    # Build
    Set-Location -Path "services\$Service"
    docker build -t aerolink-$Service .
    Set-Location -Path "..\.."

    # Tag
    docker tag aerolink-${Service}:latest "${AccountId}.dkr.ecr.${RegionUS}.amazonaws.com/aerolink-${Service}-dev:latest"
    docker tag aerolink-${Service}:latest "${AccountId}.dkr.ecr.${RegionEU}.amazonaws.com/aerolink-${Service}-dev:latest"

    # Push
    docker push "${AccountId}.dkr.ecr.${RegionUS}.amazonaws.com/aerolink-${Service}-dev:latest"
    docker push "${AccountId}.dkr.ecr.${RegionEU}.amazonaws.com/aerolink-${Service}-dev:latest"
}

# 4. Trigger Rolling Updates
Write-Host "`nTriggering Kubernetes Rolling Updates..." -ForegroundColor Cyan

foreach ($Service in $Services) {
    Write-Host "Restarting $Service in US-East-1..." -ForegroundColor Yellow
    kubectl config use-context aerolink-us
    kubectl rollout restart deployment/aerolink-$Service

    Write-Host "Restarting $Service in EU-West-1..." -ForegroundColor Yellow
    kubectl config use-context aerolink-eu
    kubectl rollout restart deployment/aerolink-$Service
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "All Security Updates Successfully Deployed Globally!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
