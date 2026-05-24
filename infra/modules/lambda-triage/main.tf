# ---------------------------------------------------------------------------
# Lambda Triage Module — Main
# Receives Security Hub findings from EventBridge, stores them in DynamoDB,
# publishes critical alerts to SNS, and invokes remediation/explainer Lambdas.
# ---------------------------------------------------------------------------

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ---- Package the Lambda source code ----
data "archive_file" "triage" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambdas/triage/"
  output_path = "${path.module}/../../../.build/triage.zip"
}

# ---- Lambda Function ----
resource "aws_lambda_function" "triage" {
  function_name    = "${var.name_prefix}-triage"
  description      = "Triages Security Hub findings — stores in DynamoDB, alerts via SNS, invokes remediation"
  filename         = data.archive_file.triage.output_path
  source_code_hash = data.archive_file.triage.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 256
  timeout          = 30
  role             = aws_iam_role.triage.arn

  environment {
    variables = {
      DYNAMODB_TABLE       = var.dynamodb_table_name
      DYNAMODB_TENANTS      = var.tenants_table_name
      SNS_TOPIC_ARN        = var.sns_topic_arn
      REMEDIATE_LAMBDA_ARN = var.lambda_remediate_arn
      EXPLAINER_LAMBDA_ARN = var.lambda_explainer_arn
      ENVIRONMENT          = var.environment
    }
  }

  tags = var.common_tags
}

# ---- CloudWatch Log Group (explicit for retention control) ----
resource "aws_cloudwatch_log_group" "triage" {
  name              = "/aws/lambda/${var.name_prefix}-triage"
  retention_in_days = 30

  tags = var.common_tags
}

# ---- IAM Role ----
resource "aws_iam_role" "triage" {
  name = "${var.name_prefix}-triage-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.common_tags
}

# ---- Least-privilege policy ----
resource "aws_iam_role_policy" "triage" {
  name = "${var.name_prefix}-triage-policy"
  role = aws_iam_role.triage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBWrite"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*",
          var.tenants_table_arn,
          "${var.tenants_table_arn}/index/*"
        ]
      },
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.sns_topic_arn
      },
      {
        Sid    = "InvokeDownstreamLambdas"
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          var.lambda_remediate_arn,
          var.lambda_explainer_arn
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.triage.arn}:*"
      }
    ]
  })
}
