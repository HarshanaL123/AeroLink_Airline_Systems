Write-Host "========================================================"
Write-Host " AeroLink Cloud - Morning Spin Up Script"
Write-Host "========================================================"
Write-Host "This script will recreate your EKS Cluster and deploy"
Write-Host "your Kubernetes microservices back to the live internet."
Write-Host "========================================================"
Write-Host ""

Write-Host "Step 1: Provisioning EKS Cluster and VPC (This takes 15-20 mins)..."
cd terraform
terraform apply -target module.vpc -target module.eks -auto-approve

Write-Host "Step 2: Re-connecting your terminal to the new cluster..."
aws eks update-kubeconfig --region us-east-1 --name AeroLink-Cluster-dev

Write-Host "Step 3: Re-deploying your Microservices..."
cd ..
# Re-install metrics server for HPA
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# Deploy all your services
kubectl apply -f k8s/

Write-Host "========================================================"
Write-Host "Spin up complete! Your system is 100% live again."
Write-Host "Run 'kubectl get ingress' to get your new live URL."
Write-Host "========================================================"
