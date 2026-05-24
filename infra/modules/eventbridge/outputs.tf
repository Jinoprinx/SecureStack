# ---------------------------------------------------------------------------
# Outputs — EventBridge Module
# ---------------------------------------------------------------------------

output "critical_findings_rule_arn" {
  description = "ARN of the EventBridge rule for HIGH/CRITICAL findings"
  value       = aws_cloudwatch_event_rule.critical_findings.arn
}

output "all_findings_rule_arn" {
  description = "ARN of the EventBridge rule for all findings"
  value       = aws_cloudwatch_event_rule.all_findings.arn
}
