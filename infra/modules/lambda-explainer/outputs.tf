# ---------------------------------------------------------------------------
# Outputs — Lambda Explainer Module
# ---------------------------------------------------------------------------

output "function_arn" {
  description = "ARN of the Lambda Explainer function"
  value       = aws_lambda_function.explainer.arn
}

output "function_name" {
  description = "Name of the Lambda Explainer function"
  value       = aws_lambda_function.explainer.function_name
}

output "invoke_arn" {
  description = "Invoke ARN of the Lambda Explainer function"
  value       = aws_lambda_function.explainer.invoke_arn
}

output "role_arn" {
  description = "ARN of the IAM role used by the Explainer Lambda"
  value       = aws_iam_role.explainer.arn
}

output "log_group_name" {
  description = "CloudWatch Log Group for the Explainer Lambda"
  value       = aws_cloudwatch_log_group.explainer.name
}
