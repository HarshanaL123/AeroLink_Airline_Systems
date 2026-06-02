$ErrorActionPreference = "Stop"
$RegionUS = "us-east-1"
$RegionEU = "eu-west-1"
$Environment = "dev"

Write-Host "Fetching AWS Account ID..." -ForegroundColor Cyan
$AccountId = (aws sts get-caller-identity --query Account --output text)

$RegistryUrlUS = "$AccountId.dkr.ecr.$RegionUS.amazonaws.com"
$RegistryUrlEU = "$AccountId.dkr.ecr.$RegionEU.amazonaws.com"

Write-Host "Logging into AWS ECR US ($RegionUS)..." -ForegroundColor Cyan
$TokenUS = (aws ecr get-login-password --region $RegionUS)
docker login --username AWS --password $TokenUS $RegistryUrlUS

Write-Host "Logging into AWS ECR EU ($RegionEU)..." -ForegroundColor Cyan
$TokenEU = (aws ecr get-login-password --region $RegionEU)
docker login --username AWS --password $TokenEU $RegistryUrlEU

$Services = @(
    "auth-service",
    "flight-service",
    "booking-service",
    "baggage-service",
    "frontend",
    "docs-service"
)

foreach ($service in $Services) {
    $RepoName = "aerolink-$service-$Environment"
    $ImageUriUS = "$RegistryUrlUS/$RepoName`:latest"
    $ImageUriEU = "$RegistryUrlEU/$RepoName`:latest"
    
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "Building Docker image for $service..." -ForegroundColor Cyan
    
    if ($service -eq "docs-service") {
        Write-Host "Copying api-docs folder into docs-service for Docker context..." -ForegroundColor Yellow
        Copy-Item -Path "api-docs" -Destination "services/docs-service/api-docs" -Recurse -Force
    }

    $ContextDir = if ($service -eq "frontend") { "frontend" } else { "services/$service" }
    
    if (-not (Test-Path $ContextDir)) {
        Write-Host "Directory $ContextDir does not exist! Please make sure you are in the project root." -ForegroundColor Red
        exit 1
    }
    
    # Build once locally
    docker build -t $RepoName $ContextDir
    
    # Tag for US and Push
    Write-Host "Tagging and Pushing to US ECR..." -ForegroundColor Cyan
    docker tag $RepoName`:latest $ImageUriUS
    docker push $ImageUriUS
    
    # Tag for EU and Push
    Write-Host "Tagging and Pushing to EU ECR..." -ForegroundColor Cyan
    docker tag $RepoName`:latest $ImageUriEU
    docker push $ImageUriEU
}

Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host "All images successfully built and pushed to BOTH US and EU AWS ECRs!" -ForegroundColor Green
