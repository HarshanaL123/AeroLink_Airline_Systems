# Custom Event Bus
resource "aws_cloudwatch_event_bus" "this" {
  name = var.bus_name
  tags = var.tags
}

# EventBridge Rules
resource "aws_cloudwatch_event_rule" "rules" {
  for_each       = var.rules
  name           = each.key
  description    = each.value.description
  event_bus_name = aws_cloudwatch_event_bus.this.name
  event_pattern  = each.value.event_pattern
  tags           = var.tags
}

# EventBridge Targets
resource "aws_cloudwatch_event_target" "targets" {
  count          = length(var.targets)
  rule           = aws_cloudwatch_event_rule.rules[var.targets[count.index].rule_name].name
  event_bus_name = aws_cloudwatch_event_bus.this.name
  target_id      = var.targets[count.index].target_id
  arn            = var.targets[count.index].arn
}
