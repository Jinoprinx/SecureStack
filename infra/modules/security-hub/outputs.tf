# ---------------------------------------------------------------------------
# Outputs — Security Hub Module
# ---------------------------------------------------------------------------

output "securityhub_account_id" {
  description = "Security Hub account resource ID"
  value       = aws_securityhub_account.main.id
}

output "cis_subscription_arn" {
  description = "ARN of the CIS Foundations Benchmark subscription"
  value       = aws_securityhub_standards_subscription.cis.id
}

output "fsbp_subscription_arn" {
  description = "ARN of the Foundational Security Best Practices subscription"
  value       = aws_securityhub_standards_subscription.fsbp.id
}
