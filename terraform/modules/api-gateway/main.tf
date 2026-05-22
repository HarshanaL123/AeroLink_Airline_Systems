# =============================================================================
# AeroLink API Gateway Module
# =============================================================================
# Provisions the main REST API Gateway that acts as the front door for all
# microservices. Implements the /api/v1/ prefix (Enhancement #3).

resource "aws_api_gateway_rest_api" "aerolink_api" {
  name        = "AeroLink-API-${var.environment}"
  description = "AeroLink Main API Gateway routing to ECS Microservices"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# -----------------------------------------------------------------------------
# Base Paths (/api and /api/v1)
# -----------------------------------------------------------------------------
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.aerolink_api.id
  parent_id   = aws_api_gateway_rest_api.aerolink_api.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "v1" {
  rest_api_id = aws_api_gateway_rest_api.aerolink_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "v1"
}

# -----------------------------------------------------------------------------
# Mock Endpoint (To allow initial deployment before ECS is ready)
# -----------------------------------------------------------------------------
resource "aws_api_gateway_method" "mock_method" {
  rest_api_id   = aws_api_gateway_rest_api.aerolink_api.id
  resource_id   = aws_api_gateway_resource.v1.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "mock_integration" {
  rest_api_id = aws_api_gateway_rest_api.aerolink_api.id
  resource_id = aws_api_gateway_resource.v1.id
  http_method = aws_api_gateway_method.mock_method.http_method
  type        = "MOCK"
  
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "mock_response" {
  rest_api_id = aws_api_gateway_rest_api.aerolink_api.id
  resource_id = aws_api_gateway_resource.v1.id
  http_method = aws_api_gateway_method.mock_method.http_method
  status_code = "200"
}

resource "aws_api_gateway_integration_response" "mock_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.aerolink_api.id
  resource_id = aws_api_gateway_resource.v1.id
  http_method = aws_api_gateway_method.mock_method.http_method
  status_code = aws_api_gateway_method_response.mock_response.status_code
  
  response_templates = {
    "application/json" = "{\"message\": \"AeroLink API Gateway V1 Foundation Active\"}"
  }
}

# -----------------------------------------------------------------------------
# Deployment and Stages (dev, prod)
# -----------------------------------------------------------------------------
resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.aerolink_api.id

  # This ensures the deployment updates if any endpoints change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api.id,
      aws_api_gateway_resource.v1.id,
      aws_api_gateway_method.mock_method.id,
      aws_api_gateway_integration.mock_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "api_stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.aerolink_api.id
  stage_name    = var.environment
}
