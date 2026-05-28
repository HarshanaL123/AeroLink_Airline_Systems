output "repository_urls" {
  description = "The URLs of the created ECR repositories"
  value       = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}
