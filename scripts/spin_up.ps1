$ErrorActionPreference = "Stop"
$RegionUS = "us-east-1"
$RegionEU = "eu-west-1"
$Environment = "dev"
$ClusterName = "AeroLink-Cluster-$Environment"

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "AeroLink Multi-Region Cloud Spin-Up Sequence Initiated!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

# 1. Provision Infrastructure
Write-Host "`n[1/6] Provisioning Global Infrastructure via Terraform..." -ForegroundColor Cyan
Set-Location -Path "terraform"
terraform init
terraform apply -auto-approve
Set-Location -Path ".."

# 1.5. Push Docker Images
Write-Host "`n[2/6] Building and Pushing Docker Images to AWS ECR..." -ForegroundColor Cyan
& .\scripts\push_to_ecr.ps1

# 2. Configure US Cluster
Write-Host "`n[3/6] Configuring US EKS Cluster ($RegionUS)..." -ForegroundColor Cyan
aws eks update-kubeconfig --region $RegionUS --name $ClusterName --alias aerolink-us
kubectl config use-context aerolink-us

Write-Host "Deploying Microservices to US Cluster..." -ForegroundColor Cyan
kubectl apply -f k8s/

# 3. Configure EU Cluster
Write-Host "`n[4/6] Configuring EU EKS Cluster ($RegionEU)..." -ForegroundColor Cyan
aws eks update-kubeconfig --region $RegionEU --name $ClusterName --alias aerolink-eu
kubectl config use-context aerolink-eu

Write-Host "Deploying Microservices to EU Cluster..." -ForegroundColor Cyan
kubectl apply -f k8s/

# 4. Wait for ALBs to Provision
Write-Host "`n[5/6] Waiting 30 seconds for AWS Application Load Balancers to provision..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# 5. Retrieve Load Balancer URLs
Write-Host "`n[6/6] Retrieving Global Access URLs..." -ForegroundColor Cyan

Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
kubectl config use-context aerolink-us
$US_ALB = (kubectl get ingress aerolink-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
Write-Host "America Region (US-East-1) URL: " -NoNewline
Write-Host "http://$US_ALB" -ForegroundColor Green

kubectl config use-context aerolink-eu
$EU_ALB = (kubectl get ingress aerolink-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
Write-Host "Europe Region  (EU-West-1) URL: " -NoNewline
Write-Host "http://$EU_ALB" -ForegroundColor Green
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow

Write-Host "`nAeroLink Multi-Region Architecture is LIVE!" -ForegroundColor Magenta
