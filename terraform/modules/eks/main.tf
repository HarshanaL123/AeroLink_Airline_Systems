module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "AeroLink-Cluster-${var.environment}"
  cluster_version = "1.35"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnets

  # Required for our local kubectl to access the cluster
  cluster_endpoint_public_access = true

  # Grants the IAM user who created the cluster (you) Administrator access!
  enable_cluster_creator_admin_permissions = true

  # Enables IAM Roles for Service Accounts (IRSA)
  # This allows Pods to authenticate with DynamoDB securely
  enable_irsa = true

  # We use EC2 Managed Node Groups for standard microservices
  eks_managed_node_groups = {
    aerolink_nodes = {
      min_size     = 2
      max_size     = 4
      desired_size = 3

      # Using the modern AL2023 operating system, which is optimized for EKS 1.30+
      ami_type       = "AL2023_x86_64_STANDARD"
      
      # Changed to t3.small because t3.micro has a hard AWS limit of 4 Pods per node.
      # t3.small allows 11 Pods per node, giving us the exact capacity we need!
      instance_types = ["t3.small"]

      # VERY IMPORTANT: Grants our EC2 worker nodes permission to read/write to DynamoDB and EventBridge!
      iam_role_additional_policies = {
        AmazonDynamoDBFullAccess   = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
        AmazonEventBridgeFullAccess = "arn:aws:iam::aws:policy/AmazonEventBridgeFullAccess"
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = "AeroLink"
  }
}

# =============================================================================
# AWS Load Balancer Controller - IAM Security Role (IRSA)
# =============================================================================
# This officially recommended module creates the massive 100+ line IAM policy
# required for the ALB controller to create AWS Load Balancers on our behalf.
data "aws_region" "current" {}

module "load_balancer_controller_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.30"

  role_name                              = "AeroLink-ALB-Controller-${var.environment}-${data.aws_region.current.name}"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}
