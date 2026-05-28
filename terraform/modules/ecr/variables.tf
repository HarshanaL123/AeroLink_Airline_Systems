variable "environment" {
  description = "Environment name"
  type        = string
}

variable "repositories" {
  description = "List of ECR repositories to create"
  type        = list(string)
  default     = [
    "aerolink-auth-service",
    "aerolink-flight-service",
    "aerolink-booking-service",
    "aerolink-baggage-service",
    "aerolink-frontend"
  ]
}
