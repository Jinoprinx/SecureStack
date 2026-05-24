# ---------------------------------------------------------------------------
# Root Outputs — Key ARNs and endpoints for CI/CD and external consumers
# ---------------------------------------------------------------------------

# ---- Config ----
output "config_recorder_id" {
  description = "AWS Config recorder ID"
  value       = module.config_rules.config_recorder_id
}

output "config_bucket_arn" {
  description = "S3 bucket ARN for Config delivery"
  value       = module.config_rules.config_bucket_arn
}

# ---- Security Hub ----
output "securityhub_account_id" {
  description = "Security Hub account resource ID"
  value       = module.security_hub.securityhub_account_id
}

# ---- DynamoDB ----
output "dynamodb_table_name" {
  description = "DynamoDB findings table name"
  value       = module.dynamodb.table_name
}

output "dynamodb_table_arn" {
  description = "DynamoDB findings table ARN"
  value       = module.dynamodb.table_arn
}

# ---- SNS ----
output "sns_topic_arn" {
  description = "SNS security alerts topic ARN"
  value       = module.sns.topic_arn
}

# ---- Lambda Functions ----
output "lambda_triage_arn" {
  description = "Lambda Triage function ARN"
  value       = module.lambda_triage.function_arn
}

output "lambda_remediate_arn" {
  description = "Lambda Remediate function ARN"
  value       = module.lambda_remediate.function_arn
}

output "lambda_explainer_arn" {
  description = "Lambda Explainer function ARN"
  value       = module.lambda_explainer.function_arn
}

# ---- EventBridge ----
output "eventbridge_critical_rule_arn" {
  description = "EventBridge rule ARN for HIGH/CRITICAL findings"
  value       = module.eventbridge.critical_findings_rule_arn
}

output "eventbridge_all_rule_arn" {
  description = "EventBridge rule ARN for all findings"
  value       = module.eventbridge.all_findings_rule_arn
}

# ---- API Gateway ----
output "api_endpoint" {
  description = "Dashboard API base URL"
  value       = module.api_gateway.api_endpoint
}

output "api_stage_name" {
  description = "Deployed API stage name"
  value       = module.api_gateway.api_stage_name
}

output "api_key_id" {
  description = "API key ID (empty if disabled)"
  value       = module.api_gateway.api_key_id
}

output "api_lambda_arn" {
  description = "API Lambda function ARN"
  value       = module.api_gateway.api_lambda_function_arn
}
