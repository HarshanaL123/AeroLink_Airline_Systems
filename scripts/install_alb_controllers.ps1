$ErrorActionPreference = "Stop"
$Environment = "dev"
$ClusterName = "AeroLink-Cluster-$Environment"

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "Installing AWS Load Balancer Controllers Globally..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

# Function to install ALB Controller in a specific region
function Install-ALBController {
    param(
        [string]$Region,
        [string]$ContextName
    )
    
    Write-Host "`n[+] Configuring ALB Controller for $ContextName ($Region)..." -ForegroundColor Cyan
    
    # 1. Switch context
    kubectl config use-context $ContextName
    
    # 2. Get AWS Account ID and VPC ID
    $AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
    $VpcId = (aws ec2 describe-vpcs --region $Region --filters "Name=tag:Environment,Values=$Environment" --query "Vpcs[0].VpcId" --output text).Trim()
    $RoleArn = "arn:aws:iam::${AccountId}:role/AeroLink-ALB-Controller-${Environment}-${Region}"

    Write-Host "    Found VPC ID: $VpcId" -ForegroundColor DarkGray
    Write-Host "    Found IAM Role: $RoleArn" -ForegroundColor DarkGray

    # 3. Add Helm Repo
    Write-Host "    Adding EKS Helm Repo..." -ForegroundColor DarkGray
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update

    # 4. Install via Helm
    Write-Host "    Deploying Helm Chart..." -ForegroundColor DarkGray
    helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller `
        -n kube-system `
        --set clusterName=$ClusterName `
        --set serviceAccount.create=true `
        --set serviceAccount.name=aws-load-balancer-controller `
        --set region=$Region `
        --set vpcId=$VpcId `
        --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=$RoleArn"

    Write-Host "    $ContextName ALB Controller Installed Successfully!" -ForegroundColor Green
}

# Install in US
Install-ALBController -Region "us-east-1" -ContextName "aerolink-us"

# Install in EU
Install-ALBController -Region "eu-west-1" -ContextName "aerolink-eu"

Write-Host "`n========================================================" -ForegroundColor Yellow
Write-Host "Controllers installed! It will take AWS ~2 minutes to provision the Load Balancers." -ForegroundColor Magenta
Write-Host "Please wait 2 minutes, then run:`n" -ForegroundColor White
Write-Host "kubectl get ingress aerolink-ingress --context aerolink-us" -ForegroundColor Cyan
Write-Host "kubectl get ingress aerolink-ingress --context aerolink-eu" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Yellow
