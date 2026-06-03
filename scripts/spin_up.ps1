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

# 1.5. Seed Database
Write-Host "`n[1.5/6] Seeding the Global DynamoDB Database..." -ForegroundColor Cyan
node .\scripts\seed-db.js

# 2. Push Docker Images
Write-Host "`n[2/6] Building and Pushing Docker Images to AWS ECR..." -ForegroundColor Cyan
& .\scripts\push_to_ecr.ps1

# 2. Configure US Cluster
Write-Host "`n[3/6] Configuring US EKS Cluster ($RegionUS)..." -ForegroundColor Cyan
aws eks update-kubeconfig --region $RegionUS --name $ClusterName --alias aerolink-us
kubectl config use-context aerolink-us

Write-Host "Installing AWS Load Balancer Controller in US Cluster..." -ForegroundColor Yellow
$US_VPC = (aws eks describe-cluster --name $ClusterName --region $RegionUS --query "cluster.resourcesVpcConfig.vpcId" --output text)
$US_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text).Trim()
$US_ROLE_ARN = "arn:aws:iam::${US_ACCOUNT_ID}:role/AeroLink-ALB-Controller-${Environment}-${RegionUS}"
helm upgrade -i aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system --set clusterName=$ClusterName --set serviceAccount.create=true --set serviceAccount.name=aws-load-balancer-controller --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=$US_ROLE_ARN --set region=$RegionUS --set vpcId=$US_VPC

Write-Host "Waiting for US Load Balancer Controller to become ready..." -ForegroundColor Yellow
kubectl rollout status deployment aws-load-balancer-controller -n kube-system --timeout=120s



Write-Host "Deploying Microservices to US Cluster..." -ForegroundColor Cyan
kubectl create secret generic aerolink-secrets --from-literal=JWT_SECRET="SuperSecretAeroLinkKey123!@#" --from-literal=STRIPE_SECRET_KEY="sk_test_123456789" --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/

# 3. Configure EU Cluster
Write-Host "`n[4/6] Configuring EU EKS Cluster ($RegionEU)..." -ForegroundColor Cyan
aws eks update-kubeconfig --region $RegionEU --name $ClusterName --alias aerolink-eu
kubectl config use-context aerolink-eu

Write-Host "Installing AWS Load Balancer Controller in EU Cluster..." -ForegroundColor Yellow
$EU_VPC = (aws eks describe-cluster --name $ClusterName --region $RegionEU --query "cluster.resourcesVpcConfig.vpcId" --output text)
$EU_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text).Trim()
$EU_ROLE_ARN = "arn:aws:iam::${EU_ACCOUNT_ID}:role/AeroLink-ALB-Controller-${Environment}-${RegionEU}"
helm upgrade -i aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system --set clusterName=$ClusterName --set serviceAccount.create=true --set serviceAccount.name=aws-load-balancer-controller --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=$EU_ROLE_ARN --set region=$RegionEU --set vpcId=$EU_VPC

Write-Host "Waiting for EU Load Balancer Controller to become ready..." -ForegroundColor Yellow
kubectl rollout status deployment aws-load-balancer-controller -n kube-system --timeout=120s



Write-Host "Deploying Microservices to EU Cluster..." -ForegroundColor Cyan
kubectl create secret generic aerolink-secrets --from-literal=JWT_SECRET="SuperSecretAeroLinkKey123!@#" --from-literal=STRIPE_SECRET_KEY="sk_test_123456789" --dry-run=client -o yaml | kubectl apply -f -
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
