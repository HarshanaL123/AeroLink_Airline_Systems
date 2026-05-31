output "queue_url" {
  description = "The URL of the created SQS queue"
  value       = aws_sqs_queue.this.url
}

output "queue_arn" {
  description = "The ARN of the created SQS queue"
  value       = aws_sqs_queue.this.arn
}

output "dlq_url" {
  description = "The URL of the created Dead Letter Queue"
  value       = aws_sqs_queue.dlq.url
}

output "dlq_arn" {
  description = "The ARN of the created Dead Letter Queue"
  value       = aws_sqs_queue.dlq.arn
}

output "dlq_name" {
  description = "The Name of the created Dead Letter Queue"
  value       = aws_sqs_queue.dlq.name
}
