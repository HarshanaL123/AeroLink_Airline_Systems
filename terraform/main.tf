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

# =============================================================================
# Event-Driven Architecture (Sync Pipeline)
# =============================================================================

# 1. SQS Queues
module "sqs_booking" {
  source     = "./modules/sqs"
  queue_name = "AeroLink-BookingQueue-${var.environment}"
}

module "sqs_baggage" {
  source     = "./modules/sqs"
  queue_name = "AeroLink-BaggageQueue-${var.environment}"
}

module "sqs_notification" {
  source     = "./modules/sqs"
  queue_name = "AeroLink-NotificationQueue-${var.environment}"
}

# 2. EventBridge Bus and Rules
module "eventbridge" {
  source   = "./modules/eventbridge"
  bus_name = "AeroLink-EventBus-${var.environment}"
  
  rules = {
    "SyncFlightUpdates" = {
      description   = "Routes flight updates to Booking, Baggage, and Notification services"
      event_pattern = jsonencode({
        "source"      = ["aerolink.flight"],
        "detail-type" = ["flight.updated", "flight.cancelled"]
      })
    }
  }

  targets = [
    {
      rule_name = "SyncFlightUpdates"
      target_id = "BookingQueueTarget"
      arn       = module.sqs_booking.queue_arn
    },
    {
      rule_name = "SyncFlightUpdates"
      target_id = "BaggageQueueTarget"
      arn       = module.sqs_baggage.queue_arn
    },
    {
      rule_name = "SyncFlightUpdates"
      target_id = "NotificationQueueTarget"
      arn       = module.sqs_notification.queue_arn
    }
  ]
}

# 3. WebSocket API Gateway (Real-Time Push to Frontend)
module "apigateway_websocket" {
  source     = "./modules/apigateway-websocket"
  name       = "AeroLink-WebSocket-${var.environment}"
  stage_name = var.environment
}

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
