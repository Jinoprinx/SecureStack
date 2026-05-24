# ---------------------------------------------------------------------------
# EventBridge Module — Main
# Routes Security Hub findings to the Lambda Triage function.
# ---------------------------------------------------------------------------

# Rule 1: HIGH/CRITICAL FAILED findings with NEW workflow status
# These are the urgent findings that need immediate triage and potential remediation.
resource "aws_cloudwatch_event_rule" "critical_findings" {
  name        = "${var.name_prefix}-critical-findings"
  description = "Routes HIGH/CRITICAL Security Hub FAILED findings (NEW workflow) to Lambda Triage"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Compliance = {
          Status = ["FAILED"]
        }
        Severity = {
          Label = ["HIGH", "CRITICAL"]
        }
        Workflow = {
          Status = ["NEW"]
        }
      }
    }
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_target" "critical_to_triage" {
  rule      = aws_cloudwatch_event_rule.critical_findings.name
  target_id = "${var.name_prefix}-critical-triage"
  arn       = var.lambda_triage_arn

  # Pass the full finding detail to the Lambda function
  input_transformer {
    input_paths = {
      source     = "$.source"
      detailType = "$.detail-type"
      detail     = "$.detail"
    }
    input_template = <<-EOF
      {
        "source": <source>,
        "detail-type": <detailType>,
        "detail": <detail>,
        "rule": "critical-findings"
      }
    EOF
  }
}

# Rule 2: All Security Hub findings — populates the dashboard DynamoDB table
resource "aws_cloudwatch_event_rule" "all_findings" {
  name        = "${var.name_prefix}-all-findings"
  description = "Routes all Security Hub findings to Lambda Triage for dashboard population"

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
  })

  tags = var.common_tags
}

resource "aws_cloudwatch_event_target" "all_to_triage" {
  rule      = aws_cloudwatch_event_rule.all_findings.name
  target_id = "${var.name_prefix}-all-triage"
  arn       = var.lambda_triage_arn
}

# ---------------------------------------------------------------------------
# Lambda permissions — allow EventBridge to invoke the triage Lambda
# ---------------------------------------------------------------------------

resource "aws_lambda_permission" "allow_eventbridge_critical" {
  statement_id  = "AllowEventBridgeCriticalFindings"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_triage_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.critical_findings.arn
}

resource "aws_lambda_permission" "allow_eventbridge_all" {
  statement_id  = "AllowEventBridgeAllFindings"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_triage_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.all_findings.arn
}
