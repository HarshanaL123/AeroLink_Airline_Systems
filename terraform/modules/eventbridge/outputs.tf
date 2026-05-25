output "event_bus_name" {
  description = "The name of the created EventBridge bus"
  value       = aws_cloudwatch_event_bus.this.name
}

output "event_bus_arn" {
  description = "The ARN of the created EventBridge bus"
  value       = aws_cloudwatch_event_bus.this.arn
}

output "rules" {
  description = "The created EventBridge rules"
  value       = aws_cloudwatch_event_rule.rules
}
