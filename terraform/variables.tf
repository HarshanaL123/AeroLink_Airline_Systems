# =============================================================================
# AeroLink — Terraform Variables
# =============================================================================

variable "aws_region" {
  description = "AWS primary region for resource deployment"
  type        = string
  default     = "us-east-1"
}

variable "aws_region_eu" {
  description = "AWS secondary region for multi-region active-active deployment"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "The environment name (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "alert_email" {
  description = "The email address to receive critical SNS alerts"
  type        = string
  default     = "syosa920@gmail.com"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "aerolink"
}

# DynamoDB Table Names
variable "users_table_name" {
  description = "DynamoDB table name for users"
  type        = string
  default     = "Users"
}

variable "flights_table_name" {
  description = "DynamoDB table name for flights"
  type        = string
  default     = "Flights"
}

variable "seats_table_name" {
  description = "DynamoDB table name for seats"
  type        = string
  default     = "Seats"
}

variable "bookings_table_name" {
  description = "DynamoDB table name for bookings"
  type        = string
  default     = "Bookings"
}

variable "payments_table_name" {
  description = "DynamoDB table name for payments"
  type        = string
  default     = "Payments"
}

variable "baggage_table_name" {
  description = "DynamoDB table name for baggage"
  type        = string
  default     = "Baggage"
}

variable "notifications_table_name" {
  description = "DynamoDB table name for notifications"
  type        = string
  default     = "Notifications"
}

# ECS Configuration
variable "ecs_task_cpu" {
  description = "CPU units for ECS tasks"
  type        = number
  default     = 256
}

variable "ecs_task_memory" {
  description = "Memory (MiB) for ECS tasks"
  type        = number
  default     = 512
}

# JWT
variable "jwt_secret" {
  description = "Secret key for JWT token signing"
  type        = string
  sensitive   = true
  default     = "aerolink-jwt-secret-change-in-production"
}
