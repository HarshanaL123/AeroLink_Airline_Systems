resource "aws_apigatewayv2_api" "websocket" {
  name                       = var.name
  protocol_type              = "WEBSOCKET"
  route_selection_expression = var.route_selection_expression
  tags                       = var.tags
}

resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = var.stage_name
  auto_deploy = true
  tags        = var.tags
}

# In a full deployment, we would also create aws_apigatewayv2_route and 
# aws_apigatewayv2_integration pointing to a Lambda function to handle 
# $connect, $disconnect, and $default routes for connection state management.
# For now, we provision the core WebSockets API Gateway endpoint.
