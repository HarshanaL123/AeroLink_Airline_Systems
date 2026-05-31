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

# Primary AWS Provider Configuration (US)
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

# Secondary AWS Provider Configuration (EU)
provider "aws" {
  alias  = "eu"
  region = var.aws_region_eu

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

# VPC Networking - US
module "vpc" {
  source      = "./modules/vpc"
  environment = var.environment
}

# VPC Networking - EU
module "vpc_eu" {
  source      = "./modules/vpc"
  environment = var.environment
  azs         = ["eu-west-1a", "eu-west-1b"]
  providers = {
    aws = aws.eu
  }
}

# Container Registry (ECR) - US Primary
module "ecr" {
  source      = "./modules/ecr"
  environment = var.environment
}

# Container Registry (ECR) - EU Secondary
module "ecr_eu" {
  source      = "./modules/ecr"
  environment = var.environment
  providers = {
    aws = aws.eu
  }
}

# DynamoDB Tables (Global Tables automatically handle replication across regions)
module "dynamodb" {
  source         = "./modules/dynamodb"
  environment    = var.environment
  replica_region = var.aws_region_eu
}

# IAM Roles & Policies (IAM is Global, no need to duplicate)
module "iam" {
  source      = "./modules/iam"
  environment = var.environment
}

# EKS Cluster & Node Groups - US
module "eks" {
  source          = "./modules/eks"
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

# EKS Cluster & Node Groups - EU
module "eks_eu" {
  source          = "./modules/eks"
  environment     = var.environment
  vpc_id          = module.vpc_eu.vpc_id
  private_subnets = module.vpc_eu.private_subnets
  providers = {
    aws = aws.eu
  }
}

# API Gateway - US
module "api_gateway" {
  source      = "./modules/api-gateway"
  environment = var.environment
}

# API Gateway - EU
module "api_gateway_eu" {
  source      = "./modules/api-gateway"
  environment = var.environment
  providers = {
    aws = aws.eu
  }
}

# =============================================================================
# Event-Driven Architecture (Sync Pipeline)
# =============================================================================

# 1. SQS Queues - US
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

# 1. SQS Queues - EU
module "sqs_booking_eu" {
  source     = "./modules/sqs"
  queue_name = "AeroLink-BookingQueue-${var.environment}"
  providers = {
    aws = aws.eu
  }
}

module "sqs_baggage_eu" {
  source     = "./modules/sqs"
  queue_name = "AeroLink-BaggageQueue-${var.environment}"
  providers = {
    aws = aws.eu
  }
}

module "sqs_notification_eu" {
  source     = "./modules/sqs"
  queue_name = "AeroLink-NotificationQueue-${var.environment}"
  providers = {
    aws = aws.eu
  }
}

# 2. EventBridge Bus and Rules - US
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

# 2. EventBridge Bus and Rules - EU
module "eventbridge_eu" {
  source   = "./modules/eventbridge"
  bus_name = "AeroLink-EventBus-${var.environment}"
  providers = {
    aws = aws.eu
  }
  
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
      arn       = module.sqs_booking_eu.queue_arn
    },
    {
      rule_name = "SyncFlightUpdates"
      target_id = "BaggageQueueTarget"
      arn       = module.sqs_baggage_eu.queue_arn
    },
    {
      rule_name = "SyncFlightUpdates"
      target_id = "NotificationQueueTarget"
      arn       = module.sqs_notification_eu.queue_arn
    }
  ]
}

# 3. WebSocket API Gateway (Real-Time Push to Frontend) - US
module "apigateway_websocket" {
  source     = "./modules/apigateway-websocket"
  name       = "AeroLink-WebSocket-${var.environment}"
  stage_name = var.environment
}

# 3. WebSocket API Gateway (Real-Time Push to Frontend) - EU
module "apigateway_websocket_eu" {
  source     = "./modules/apigateway-websocket"
  name       = "AeroLink-WebSocket-${var.environment}"
  stage_name = var.environment
  providers = {
    aws = aws.eu
  }
}

# Lambda (Notification Service)
# module "lambda" {
#   source      = "./modules/lambda"
#   environment = var.environment
# }

# CloudWatch Monitoring - US
module "cloudwatch" {
  source      = "./modules/cloudwatch"
  environment = var.environment
  alert_email = var.alert_email
  dlq_names = [
    module.sqs_booking.dlq_name,
    module.sqs_baggage.dlq_name,
    module.sqs_notification.dlq_name
  ]
}

# CloudWatch Monitoring - EU
module "cloudwatch_eu" {
  source      = "./modules/cloudwatch"
  environment = var.environment
  alert_email = var.alert_email
  providers = {
    aws = aws.eu
  }
  dlq_names = [
    module.sqs_booking_eu.dlq_name,
    module.sqs_baggage_eu.dlq_name,
    module.sqs_notification_eu.dlq_name
  ]
}
