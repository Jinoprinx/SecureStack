# ---------------------------------------------------------------------------
# Outputs — Lambda Triage Module
# ---------------------------------------------------------------------------

output "function_arn" {
  description = "ARN of the Lambda Triage function"
  value       = aws_lambda_function.triage.arn
}

output "function_name" {
  description = "Name of the Lambda Triage function"
  value       = aws_lambda_function.triage.function_name
}

output "invoke_arn" {
  description = "Invoke ARN of the Lambda Triage function (for API Gateway)"
  value       = aws_lambda_function.triage.invoke_arn
}

output "role_arn" {
  description = "ARN of the IAM role used by the Triage Lambda"
  value       = aws_iam_role.triage.arn
}

output "log_group_name" {
  description = "CloudWatch Log Group for the Triage Lambda"
  value       = aws_cloudwatch_log_group.triage.name
}
