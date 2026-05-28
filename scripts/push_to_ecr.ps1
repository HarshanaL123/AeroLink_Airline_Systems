$ErrorActionPreference = "Stop"
$Region = "us-east-1"
$Environment = "dev"

Write-Host "Fetching AWS Account ID..." -ForegroundColor Cyan
$AccountId = (aws sts get-caller-identity --query Account --output text)
$RegistryUrl = "$AccountId.dkr.ecr.$Region.amazonaws.com"

Write-Host "Logging into AWS ECR at $RegistryUrl..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $RegistryUrl

$Services = @(
    "auth-service",
    "flight-service",
    "booking-service",
    "baggage-service",
    "frontend"
)

foreach ($service in $Services) {
    $RepoName = "aerolink-$service-$Environment"
    $ImageUri = "$RegistryUrl/$RepoName`:latest"
    
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "Building Docker image for $service..." -ForegroundColor Cyan
    
    $ContextDir = if ($service -eq "frontend") { "frontend" } else { "services/$service" }
    
    # Check if directory exists
    if (-not (Test-Path $ContextDir)) {
        Write-Host "Directory $ContextDir does not exist! Please make sure you are in the project root." -ForegroundColor Red
        exit 1
    }
    
    docker build -t $RepoName $ContextDir
    docker tag $RepoName`:latest $ImageUri
    
    Write-Host "Pushing $ImageUri to ECR..." -ForegroundColor Cyan
    docker push $ImageUri
}

Write-Host "All images successfully built and pushed to AWS ECR!" -ForegroundColor Green
