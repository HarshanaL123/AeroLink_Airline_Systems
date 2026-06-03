$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "AeroLink Multi-Region Tear-Down Sequence Initiated!" -ForegroundColor Red
Write-Host "========================================================" -ForegroundColor Yellow

# 1. Delete Kubernetes Resources (CRITICAL to release ALBs before Terraform runs)
Write-Host "`n[1/3] Deleting Kubernetes Resources in EU Cluster..." -ForegroundColor Cyan
aws eks update-kubeconfig --region eu-west-1 --name AeroLink-Cluster-dev
kubectl delete application aerolink-microservices -n argocd --ignore-not-found
kubectl delete -f k8s/

Write-Host "`n[2/3] Deleting Kubernetes Resources in US Cluster..." -ForegroundColor Cyan
aws eks update-kubeconfig --region us-east-1 --name AeroLink-Cluster-dev
kubectl delete application aerolink-microservices -n argocd --ignore-not-found
kubectl delete -f k8s/

Write-Host "`nWaiting 30 seconds for AWS Load Balancers to fully unbind..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# 2. Destroy Infrastructure
Write-Host "`n[3/3] Destroying Global Infrastructure via Terraform..." -ForegroundColor Cyan
Set-Location -Path "terraform"
terraform destroy -auto-approve
Set-Location -Path ".."

Write-Host "`n========================================================" -ForegroundColor Yellow
Write-Host "Tear-down complete! Your AWS Free Tier is safe." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow
