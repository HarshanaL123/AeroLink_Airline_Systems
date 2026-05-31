# =============================================================================
# AeroLink CloudWatch Monitoring Module
# =============================================================================
# Provisions SNS Alerting and CloudWatch Alarms for Dead Letter Queues
# =============================================================================

# 1. Create SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "AeroLink-Alerts-${var.environment}"
}

# 2. Subscribe Admin Email to SNS Topic
resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# 3. Create Alarms for each DLQ
resource "aws_cloudwatch_metric_alarm" "dlq_alarm" {
  for_each            = toset(var.dlq_names)
  alarm_name          = "${each.value}-MessagesVisible"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60 # Check every 60 seconds
  statistic           = "Sum"
  threshold           = 1  # Trigger if 1 or more messages land in DLQ
  alarm_description   = "CRITICAL: Message detected in Dead Letter Queue: ${each.value}. A microservice has failed to process an event."
  
  # Trigger SNS Email on Alarm state
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    QueueName = each.value
  }
}
