$ErrorActionPreference = "Stop"
$RegionUS = "us-east-1"
$RegionEU = "eu-west-1"
$RepoName = "aerolink-auth-service-dev"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Redeploying Auth Service Globally" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow

# 1. Get AWS Account ID (Trim to remove Windows carriage returns)
$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()

# 2. Authenticate Docker to ECR
Write-Host "`nAuthenticating Docker to AWS ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $RegionUS | docker login --username AWS --password-stdin "${AccountId}.dkr.ecr.${RegionUS}.amazonaws.com"
aws ecr get-login-password --region $RegionEU | docker login --username AWS --password-stdin "${AccountId}.dkr.ecr.${RegionEU}.amazonaws.com"

# 3. Build the Auth Service Docker Image
Write-Host "`nBuilding Auth Service Docker Image..." -ForegroundColor Cyan
Set-Location -Path "services\auth-service"
docker build -t aerolink-auth-service .
Set-Location -Path "..\.."

# 4. Tag the Image for US and EU
Write-Host "`nTagging Docker Images..." -ForegroundColor Cyan
docker tag aerolink-auth-service:latest "${AccountId}.dkr.ecr.${RegionUS}.amazonaws.com/${RepoName}:latest"
docker tag aerolink-auth-service:latest "${AccountId}.dkr.ecr.${RegionEU}.amazonaws.com/${RepoName}:latest"

# 5. Push to US and EU ECR
Write-Host "`nPushing to US-East-1 ECR..." -ForegroundColor Cyan
docker push "${AccountId}.dkr.ecr.${RegionUS}.amazonaws.com/${RepoName}:latest"

Write-Host "`nPushing to EU-West-1 ECR..." -ForegroundColor Cyan
docker push "${AccountId}.dkr.ecr.${RegionEU}.amazonaws.com/${RepoName}:latest"

# 6. Trigger Rolling Update on Kubernetes
Write-Host "`nTriggering Kubernetes Rolling Update in US..." -ForegroundColor Cyan
kubectl config use-context aerolink-us
kubectl rollout restart deployment/aerolink-auth-service

Write-Host "`nTriggering Kubernetes Rolling Update in EU..." -ForegroundColor Cyan
kubectl config use-context aerolink-eu
kubectl rollout restart deployment/aerolink-auth-service

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "Auth Service Successfully Redeployed Globally!" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Yellow
