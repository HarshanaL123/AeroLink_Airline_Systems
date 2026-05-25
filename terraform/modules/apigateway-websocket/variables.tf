variable "name" {
  description = "The name of the WebSocket API"
  type        = string
}

variable "route_selection_expression" {
  description = "The route selection expression for the API"
  type        = string
  default     = "$request.body.action"
}

variable "stage_name" {
  description = "The name of the API Gateway stage"
  type        = string
  default     = "production"
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
