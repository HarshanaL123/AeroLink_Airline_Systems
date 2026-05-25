output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "flights_table_name" {
  value = aws_dynamodb_table.flights.name
}

output "seats_table_name" {
  value = aws_dynamodb_table.seats.name
}

output "bookings_table_name" {
  value = aws_dynamodb_table.bookings.name
}

output "payments_table_name" {
  value = aws_dynamodb_table.payments.name
}

output "baggage_table_name" {
  value = aws_dynamodb_table.baggage.name
}

output "notifications_table_name" {
  value = aws_dynamodb_table.notifications.name
}

output "flights_stream_arn" {
  value = aws_dynamodb_table.flights.stream_arn
}

output "seats_stream_arn" {
  value = aws_dynamodb_table.seats.stream_arn
}

output "bookings_stream_arn" {
  value = aws_dynamodb_table.bookings.stream_arn
}
