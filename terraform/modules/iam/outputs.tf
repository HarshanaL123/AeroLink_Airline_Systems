output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS Task Execution Role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda Execution Role"
  value       = aws_iam_role.lambda_execution_role.arn
}
