# ---------------------------------------------------------------------------
# Outputs — Lambda Remediate Module
# ---------------------------------------------------------------------------

output "function_arn" {
  description = "ARN of the Lambda Remediate function"
  value       = aws_lambda_function.remediate.arn
}

output "function_name" {
  description = "Name of the Lambda Remediate function"
  value       = aws_lambda_function.remediate.function_name
}

output "invoke_arn" {
  description = "Invoke ARN of the Lambda Remediate function"
  value       = aws_lambda_function.remediate.invoke_arn
}

output "role_arn" {
  description = "ARN of the IAM role used by the Remediate Lambda"
  value       = aws_iam_role.remediate.arn
}

output "log_group_name" {
  description = "CloudWatch Log Group for the Remediate Lambda"
  value       = aws_cloudwatch_log_group.remediate.name
}
