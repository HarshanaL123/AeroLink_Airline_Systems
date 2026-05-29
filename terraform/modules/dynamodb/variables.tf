variable "environment" {
  description = "The deployment environment (e.g., dev, prod)"
  type        = string
}

variable "replica_region" {
  description = "The AWS region where the DynamoDB Global Table replica will be created"
  type        = string
}
