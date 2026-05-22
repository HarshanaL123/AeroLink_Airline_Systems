output "api_gateway_id" {
  description = "The ID of the REST API"
  value       = aws_api_gateway_rest_api.aerolink_api.id
}

output "api_gateway_invoke_url" {
  description = "The base URL to invoke the API"
  value       = aws_api_gateway_stage.api_stage.invoke_url
}

output "api_v1_resource_id" {
  description = "The ID of the /api/v1 resource"
  value       = aws_api_gateway_resource.v1.id
}
