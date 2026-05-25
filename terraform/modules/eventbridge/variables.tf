variable "bus_name" {
  description = "The name of the custom EventBridge bus"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

variable "rules" {
  description = "Map of EventBridge rules"
  type = map(object({
    description   = string
    event_pattern = string
  }))
  default = {}
}

variable "targets" {
  description = "List of targets to attach to the rules"
  type = list(object({
    rule_name = string
    target_id = string
    arn       = string
  }))
  default = []
}
