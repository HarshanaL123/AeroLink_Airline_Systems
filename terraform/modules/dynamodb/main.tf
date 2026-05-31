# =============================================================================
# AeroLink DynamoDB Module
# =============================================================================
# Provisions the NoSQL tables for the microservices.
# Uses PAY_PER_REQUEST (On-Demand) billing to stay well within the free tier
# while handling unpredictable traffic safely.
# =============================================================================

# 1. Users Table (Auth Service)
resource "aws_dynamodb_table" "users" {
  name             = "AeroLink-Users-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "userId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled = true
  }

  attribute {
    name = "userId"
    type = "S"
  }
  
  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name               = "EmailIndex"
    hash_key           = "email"
    projection_type    = "ALL"
  }

  replica {
    region_name = var.replica_region
  }
}

# 2. Flights Table (Flight Service)
resource "aws_dynamodb_table" "flights" {
  name             = "AeroLink-Flights-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "flightId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled = true
  }

  attribute {
    name = "flightId"
    type = "S"
  }
  
  attribute {
    name = "routeDate" # E.g., "JFK-LHR#2026-06-01" for fast searching
    type = "S"
  }

  global_secondary_index {
    name               = "RouteDateIndex"
    hash_key           = "routeDate"
    projection_type    = "ALL"
  }

  replica {
    region_name = var.replica_region
  }
}

# 3. Seats Table (Flight/Booking Service)
resource "aws_dynamodb_table" "seats" {
  name             = "AeroLink-Seats-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "flightId"
  range_key        = "seatId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled = true
  }

  attribute {
    name = "flightId"
    type = "S"
  }

  attribute {
    name = "seatId"
    type = "S"
  }

  replica {
    region_name = var.replica_region
  }
}

# 4. Bookings Table (Booking Service)
resource "aws_dynamodb_table" "bookings" {
  name             = "AeroLink-Bookings-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "bookingId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled = true
  }

  attribute {
    name = "bookingId"
    type = "S"
  }
  
  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name               = "UserBookingsIndex"
    hash_key           = "userId"
    projection_type    = "ALL"
  }

  replica {
    region_name = var.replica_region
  }
}

# 5. Payments Table (Booking Service / Saga)
resource "aws_dynamodb_table" "payments" {
  name             = "AeroLink-Payments-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "paymentId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled = true
  }

  attribute {
    name = "paymentId"
    type = "S"
  }

  replica {
    region_name = var.replica_region
  }
}

# 6. Baggage Table (Baggage Service)
resource "aws_dynamodb_table" "baggage" {
  name             = "AeroLink-Baggage-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "baggageId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled = true
  }

  attribute {
    name = "baggageId"
    type = "S"
  }
  
  attribute {
    name = "bookingId"
    type = "S"
  }

  global_secondary_index {
    name               = "BookingBaggageIndex"
    hash_key           = "bookingId"
    projection_type    = "ALL"
  }

  replica {
    region_name = var.replica_region
  }
}

# 7. Notifications Table (Notification Service)
resource "aws_dynamodb_table" "notifications" {
  name             = "AeroLink-Notifications-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "notificationId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled = true
  }

  attribute {
    name = "notificationId"
    type = "S"
  }
  
  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name               = "UserNotificationsIndex"
    hash_key           = "userId"
    projection_type    = "ALL"
  }

  replica {
    region_name = var.replica_region
  }
}
