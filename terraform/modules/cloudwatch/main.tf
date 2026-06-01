# =============================================================================
# AeroLink CloudWatch Monitoring Module
# =============================================================================
# Provisions SNS Alerting, CloudWatch Alarms, and a Custom Dashboard
# =============================================================================

data "aws_region" "current" {}

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

# 4. Lambda High Error Rate Alarm (Notification Service)
resource "aws_cloudwatch_metric_alarm" "lambda_error_alarm" {
  alarm_name          = "AeroLink-NotificationService-Errors-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 5 # Trigger if 5+ errors occur in a minute
  alarm_description   = "WARNING: High error rate detected in the Notification Service Lambda function."
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

# 5. DynamoDB High Latency Alarm
resource "aws_cloudwatch_metric_alarm" "dynamodb_latency_alarm" {
  alarm_name          = "AeroLink-DynamoDB-HighLatency-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessfulRequestLatency"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Average"
  threshold           = 100 # Trigger if average DB latency is > 100ms
  alarm_description   = "PERFORMANCE ALERT: DynamoDB is experiencing high read/write latency (>100ms)."
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    TableName = "AeroLink-Bookings-${var.environment}"
    Operation = "PutItem"
  }
}

# 6. Global Executive Dashboard
resource "aws_cloudwatch_dashboard" "aerolink_dashboard" {
  dashboard_name = "AeroLink-Operations-${data.aws_region.current.name}-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric",
        x      = 0,
        y      = 0,
        width  = 12,
        height = 6,
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "AeroLink-Flights-${var.environment}"],
            [".", "ConsumedWriteCapacityUnits", ".", "."]
          ],
          view    = "timeSeries",
          stacked = false,
          region  = data.aws_region.current.name,
          title   = "DynamoDB Flight Table Traffic (${data.aws_region.current.name})"
        }
      },
      {
        type   = "metric",
        x      = 12,
        y      = 0,
        width  = 12,
        height = 6,
        properties = {
          metrics = [
            ["AWS/SQS", "NumberOfMessagesSent", "QueueName", "AeroLink-BookingQueue-${var.environment}"],
            [".", "NumberOfMessagesReceived", ".", "."]
          ],
          view    = "timeSeries",
          stacked = false,
          region  = data.aws_region.current.name,
          title   = "SQS Booking Queue Velocity (${data.aws_region.current.name})"
        }
      },
      {
        type   = "metric",
        x      = 0,
        y      = 6,
        width  = 12,
        height = 6,
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name],
            [".", "Errors", ".", "."]
          ],
          view    = "timeSeries",
          stacked = false,
          region  = data.aws_region.current.name,
          title   = "Notification Lambda Health (${data.aws_region.current.name})"
        }
      }
    ]
  })
}
