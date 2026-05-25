output "api_id" {
  description = "The ID of the WebSocket API Gateway"
  value       = aws_apigatewayv2_api.websocket.id
}

output "api_endpoint" {
  description = "The URL to connect to the WebSocket API"
  value       = aws_apigatewayv2_api.websocket.api_endpoint
}

output "invoke_url" {
  description = "The URL used by backend services to push messages to connected WebSocket clients"
  value       = aws_apigatewayv2_stage.stage.invoke_url
}
