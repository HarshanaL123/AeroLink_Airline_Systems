# =============================================================================
# AeroLink Airline Systems — Terraform Main Configuration
# =============================================================================
# This is the root Terraform configuration that orchestrates all modules
# for the AeroLink cloud infrastructure on AWS.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "AeroLink"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# =============================================================================
# Modules (will be enabled as we build each component)
# =============================================================================

# DynamoDB Tables
module "dynamodb" {
  source      = "./modules/dynamodb"
  environment = var.environment
}

# IAM Roles & Policies
module "iam" {
  source      = "./modules/iam"
  environment = var.environment
}

# ECS Cluster & Services
# module "ecs" {
#   source      = "./modules/ecs"
#   environment = var.environment
# }

# API Gateway
module "api_gateway" {
  source      = "./modules/api-gateway"
  environment = var.environment
}

# EventBridge
# module "eventbridge" {
#   source      = "./modules/eventbridge"
#   environment = var.environment
# }

# Lambda (Notification Service)
# module "lambda" {
#   source      = "./modules/lambda"
#   environment = var.environment
# }

# CloudWatch Monitoring
# module "cloudwatch" {
#   source      = "./modules/cloudwatch"
#   environment = var.environment
# }
