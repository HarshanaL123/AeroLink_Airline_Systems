# =============================================================================
# AeroLink — Terraform Outputs
# =============================================================================

output "aws_region" {
  description = "AWS region used for deployment"
  value       = var.aws_region
}

output "environment" {
  description = "Current deployment environment"
  value       = var.environment
}

# Outputs will be added as modules are enabled
# output "api_gateway_url" { ... }
# output "ecs_cluster_name" { ... }
# output "dynamodb_table_names" { ... }
