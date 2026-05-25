variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "handler" {
  description = "The entry point into your Lambda function"
  type        = string
  default     = "src/handler.handler"
}

variable "runtime" {
  description = "The runtime environment for the Lambda function"
  type        = string
  default     = "nodejs20.x"
}

variable "source_dir" {
  description = "The path to the source code directory to be zipped"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "event_bus_name" {
  description = "The name of the EventBridge bus that will trigger this Lambda"
  type        = string
}

variable "event_pattern" {
  description = "The EventBridge rule pattern (JSON string) to trigger this Lambda"
  type        = string
}
