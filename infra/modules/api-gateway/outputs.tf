# ---------------------------------------------------------------------------
# Outputs — API Gateway Module
# ---------------------------------------------------------------------------

output "api_id" {
  description = "ID of the REST API"
  value       = aws_api_gateway_rest_api.dashboard.id
}

output "api_endpoint" {
  description = "Base URL of the deployed API stage"
  value       = aws_api_gateway_stage.dashboard.invoke_url
}

output "api_execution_arn" {
  description = "Execution ARN of the REST API"
  value       = aws_api_gateway_rest_api.dashboard.execution_arn
}

output "api_stage_name" {
  description = "Name of the deployed API stage"
  value       = aws_api_gateway_stage.dashboard.stage_name
}

output "api_key_id" {
  description = "ID of the API key (empty if api_key is disabled)"
  value       = var.enable_api_key ? aws_api_gateway_api_key.dashboard[0].id : ""
}

output "api_key_value" {
  description = "Value of the API key (sensitive, empty if disabled)"
  value       = var.enable_api_key ? aws_api_gateway_api_key.dashboard[0].value : ""
  sensitive   = true
}

output "api_lambda_function_arn" {
  description = "ARN of the API Lambda function"
  value       = aws_lambda_function.api.arn
}

output "api_lambda_function_name" {
  description = "Name of the API Lambda function"
  value       = aws_lambda_function.api.function_name
}
