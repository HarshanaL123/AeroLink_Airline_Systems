Write-Host "========================================================"
Write-Host " AeroLink Cloud - Cost Saving Tear Down Script"
Write-Host "========================================================"
Write-Host "This script will delete your expensive Kubernetes Servers"
Write-Host "and Load Balancers so you don't get charged overnight."
Write-Host "Your Databases (DynamoDB) and Docker Images (ECR) are SAFE."
Write-Host "========================================================"
Write-Host ""

Write-Host "Step 1: Deleting AWS Application Load Balancer..."
# We must delete the ingress first so AWS deletes the physical ALB
kubectl delete ingress aerolink-ingress --ignore-not-found
Start-Sleep -Seconds 20

Write-Host "Step 2: Destroying EKS Cluster and NAT Gateways (This takes 10-15 mins)..."
cd terraform
# We specifically target the expensive modules only
terraform destroy -target module.eks -target module.vpc -auto-approve

Write-Host "========================================================"
Write-Host "Tear down complete! You can now safely go to sleep."
Write-Host "========================================================"
