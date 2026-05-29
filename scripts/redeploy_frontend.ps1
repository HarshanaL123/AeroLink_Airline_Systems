$ErrorActionPreference = "Stop"
$RegionUS = "us-east-1"
$RegionEU = "eu-west-1"
$Environment = "dev"
$RepoName = "aerolink-frontend-dev"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Redeploying Frontend (Multi-Region Fix)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Yellow

# 1. Temporarily hide local environment variables so they aren't baked into the image
Write-Host "Hiding .env.local..." -ForegroundColor DarkGray
if (Test-Path "frontend\.env.local") {
    Rename-Item -Path "frontend\.env.local" -NewName ".env.local.bak"
}

# 2. Get AWS Account ID and ECR URLs
Write-Host "Fetching AWS Account ID..." -ForegroundColor DarkGray
$AccountId = (aws sts get-caller-identity --query Account --output text)
$RegistryUrlUS = "$AccountId.dkr.ecr.$RegionUS.amazonaws.com"
$RegistryUrlEU = "$AccountId.dkr.ecr.$RegionEU.amazonaws.com"

# 3. Build Docker Image
Write-Host "Building Docker image for frontend..." -ForegroundColor Cyan
docker build -t $RepoName frontend

# 4. Restore the local env file
if (Test-Path "frontend\.env.local.bak") {
    Write-Host "Restoring .env.local..." -ForegroundColor DarkGray
    Rename-Item -Path "frontend\.env.local.bak" -NewName ".env.local"
}

# 5. Push to US ECR
Write-Host "Logging into AWS ECR US ($RegionUS)..." -ForegroundColor Cyan
$TokenUS = (aws ecr get-login-password --region $RegionUS)
docker login --username AWS --password $TokenUS $RegistryUrlUS

$ImageUriUS = "$RegistryUrlUS/$RepoName`:latest"
Write-Host "Tagging and Pushing to US ECR..." -ForegroundColor Cyan
docker tag $RepoName`:latest $ImageUriUS
docker push $ImageUriUS

# 6. Push to EU ECR
Write-Host "Logging into AWS ECR EU ($RegionEU)..." -ForegroundColor Cyan
$TokenEU = (aws ecr get-login-password --region $RegionEU)
docker login --username AWS --password $TokenEU $RegistryUrlEU

$ImageUriEU = "$RegistryUrlEU/$RepoName`:latest"
Write-Host "Tagging and Pushing to EU ECR..." -ForegroundColor Cyan
docker tag $RepoName`:latest $ImageUriEU
docker push $ImageUriEU

# 7. Restart Kubernetes Deployments
Write-Host "Restarting Frontend Pods in US Cluster..." -ForegroundColor Cyan
kubectl rollout restart deployment aerolink-frontend --context aerolink-us

Write-Host "Restarting Frontend Pods in EU Cluster..." -ForegroundColor Cyan
kubectl rollout restart deployment aerolink-frontend --context aerolink-eu

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Frontend Successfully Redeployed Globally!" -ForegroundColor Green
Write-Host "Please wait ~30 seconds for the new pods to boot up before testing." -ForegroundColor Yellow
