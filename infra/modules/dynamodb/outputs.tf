# ---------------------------------------------------------------------------
# Outputs — DynamoDB Module
# ---------------------------------------------------------------------------

output "table_name" {
  description = "Name of the DynamoDB findings table"
  value       = aws_dynamodb_table.findings.name
}

output "table_arn" {
  description = "ARN of the DynamoDB findings table"
  value       = aws_dynamodb_table.findings.arn
}

output "tenants_table_name" {
  description = "Name of the DynamoDB tenants table"
  value       = aws_dynamodb_table.tenants.name
}

output "tenants_table_arn" {
  description = "ARN of the DynamoDB tenants table"
  value       = aws_dynamodb_table.tenants.arn
}

output "severity_index_name" {
  description = "Name of the severity GSI"
  value       = "severity-index"
}

output "compliance_index_name" {
  description = "Name of the compliance GSI"
  value       = "compliance-index"
}

output "status_index_name" {
  description = "Name of the status GSI"
  value       = "status-index"
}
