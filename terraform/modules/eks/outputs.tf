output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if `enable_irsa` = `true`"
  value       = module.eks.oidc_provider_arn
}

output "alb_iam_role_arn" {
  description = "IAM Role ARN for the AWS Load Balancer Controller"
  value       = module.load_balancer_controller_irsa_role.iam_role_arn
}
