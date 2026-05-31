$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "Setting up Terraform Remote S3 Backend & DynamoDB Locking" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

# 1. Get AWS Account ID for globally unique bucket name
Write-Host "`n[1/3] Fetching AWS Account ID..." -ForegroundColor Cyan
$AccountId = (aws sts get-caller-identity --query Account --output text)
$BucketName = "aerolink-terraform-state-$AccountId"
$TableName = "aerolink-terraform-locks"
$Region = "us-east-1"

Write-Host "Account ID: $AccountId" -ForegroundColor DarkGray
Write-Host "Target S3 Bucket: $BucketName" -ForegroundColor DarkGray

# 2. Create S3 Bucket (us-east-1 does not need LocationConstraint)
Write-Host "`n[2/3] Creating S3 Bucket for Terraform State..." -ForegroundColor Cyan
# Check if bucket exists first
$BucketExists = $false
try {
    aws s3api head-bucket --bucket $BucketName 2>$null
    $BucketExists = $true
    Write-Host "Bucket already exists. Skipping creation." -ForegroundColor DarkGray
} catch {
    # If error occurs, bucket doesn't exist or we lack permissions. Assume it doesn't exist.
}

if (-not $BucketExists) {
    aws s3api create-bucket --bucket $BucketName --region $Region
    
    # Enable Versioning
    Write-Host "Enabling Bucket Versioning (Critical for State Recovery)..." -ForegroundColor DarkGray
    aws s3api put-bucket-versioning --bucket $BucketName --versioning-configuration Status=Enabled
    
    # Enable Server-Side Encryption
    Write-Host "Enabling Default AES256 Encryption..." -ForegroundColor DarkGray
    aws s3api put-bucket-encryption --bucket $BucketName --server-side-encryption-configuration '{"rules":[{"applyServerSideEncryptionByDefault":{"sseAlgorithm":"AES256"}}]}'
    
    # Block Public Access
    Write-Host "Blocking Public Access..." -ForegroundColor DarkGray
    aws s3api put-public-access-block --bucket $BucketName --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
}

# 3. Create DynamoDB Table for Locking
Write-Host "`n[3/3] Creating DynamoDB State Lock Table..." -ForegroundColor Cyan
$TableExists = $false
try {
    aws dynamodb describe-table --table-name $TableName --region $Region 2>$null | Out-Null
    $TableExists = $true
    Write-Host "DynamoDB Table already exists. Skipping creation." -ForegroundColor DarkGray
} catch {
    # Doesn't exist
}

if (-not $TableExists) {
    aws dynamodb create-table `
        --table-name $TableName `
        --attribute-definitions AttributeName=LockID,AttributeType=S `
        --key-schema AttributeName=LockID,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --region $Region | Out-Null
        
    Write-Host "Waiting for DynamoDB table to become active..." -ForegroundColor DarkGray
    aws dynamodb wait table-exists --table-name $TableName --region $Region
}

Write-Host "`n========================================================" -ForegroundColor Yellow
Write-Host "Backend Infrastructure Successfully Provisioned!" -ForegroundColor Green
Write-Host "You can now configure the 'backend' block in Terraform." -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Yellow
