# =============================================================================
# AeroLink Enterprise GitOps Setup Script (Enhancement #1)
# Installs ArgoCD and Configures the Multi-Region Automated Deployment Pipeline
# =============================================================================

Write-Host "🚀 Setting up Enterprise GitOps (ArgoCD) pipeline..." -ForegroundColor Cyan

# 1. Install ArgoCD
Write-Host "📦 Installing ArgoCD to Kubernetes Cluster..." -ForegroundColor Yellow
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Wait for ArgoCD Server to be ready
Write-Host "⏳ Waiting for ArgoCD pods to spin up (this may take 1-2 minutes)..." -ForegroundColor Yellow
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# 3. Expose ArgoCD Server Locally
Write-Host "🌐 Exposing ArgoCD Server on localhost:8080..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command kubectl port-forward svc/argocd-server -n argocd 8080:443"

# 4. Get Initial Admin Password
Write-Host "⏳ Extracting ArgoCD Admin Password..." -ForegroundColor Yellow
$argocdPassword = kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | Foreach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
Write-Host "🔑 ArgoCD Admin Password: $argocdPassword" -ForegroundColor Green
Write-Host "👤 Username: admin" -ForegroundColor Green

# 5. Apply the AeroLink GitOps Application
Write-Host "🔗 Linking EKS Cluster to GitHub Repository for automated deployments..." -ForegroundColor Yellow

$argoAppYaml = @"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: aerolink-microservices
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'https://github.com/HarshanaL123/AeroLink_Airline_Systems.git'
    path: k8s
    targetRevision: HEAD
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
"@

$argoAppYaml | kubectl apply -f -

Write-Host "✅ GitOps Pipeline successfully initialized!" -ForegroundColor Green
Write-Host "ArgoCD is now watching your repository. Every time you push code, EKS will instantly update." -ForegroundColor Cyan
Write-Host "Open a browser and navigate to https://localhost:8080 to view the GitOps Dashboard." -ForegroundColor Magenta
