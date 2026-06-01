variable "environment" {
  description = "The environment name (e.g., dev, prod)"
  type        = string
}

variable "alert_email" {
  description = "The email address to send SNS alerts to"
  type        = string
}

variable "dlq_names" {
  description = "List of Dead Letter Queue names to monitor"
  type        = list(string)
  default     = []
}

variable "lambda_function_name" {
  description = "The name of the Notification Service Lambda function to monitor"
  type        = string
}
