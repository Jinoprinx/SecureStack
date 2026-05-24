# ---------------------------------------------------------------------------
# Security Hub Module — Main
# Enables Security Hub and subscribes to CIS + FSBP compliance standards.
# ---------------------------------------------------------------------------

resource "aws_securityhub_account" "main" {}

# CIS AWS Foundations Benchmark v1.4.0
resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"

  depends_on = [aws_securityhub_account.main]
}

# AWS Foundational Security Best Practices v1.0.0
resource "aws_securityhub_standards_subscription" "fsbp" {
  standards_arn = "arn:aws:securityhub:${data.aws_region.current.name}::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.main]
}

# Data source needed to build the FSBP ARN with the current region
data "aws_region" "current" {}
