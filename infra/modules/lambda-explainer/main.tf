# ---------------------------------------------------------------------------
# Lambda Explainer Module — Main
# Uses Amazon Bedrock to generate human-readable explanations of findings.
# Higher timeout (60s) because Bedrock model inference is slower.
# ---------------------------------------------------------------------------

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ---- Package the Lambda source code ----
data "archive_file" "explainer" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambdas/explainer/"
  output_path = "${path.module}/../../../.build/explainer.zip"
}

# ---- Lambda Function ----
resource "aws_lambda_function" "explainer" {
  function_name    = "${var.name_prefix}-explainer"
  description      = "AI-powered finding explainer using Amazon Bedrock"
  filename         = data.archive_file.explainer.output_path
  source_code_hash = data.archive_file.explainer.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 256
  # Bedrock inference can be slow — 60s timeout ensures we don't cut off mid-response
  timeout = 60
  role    = aws_iam_role.explainer.arn

  environment {
    variables = {
      DYNAMODB_TABLE   = var.dynamodb_table_name
      SNS_TOPIC_ARN    = var.sns_topic_arn
      BEDROCK_MODEL_ID = var.bedrock_model_id
      ENVIRONMENT      = var.environment
    }
  }

  tags = var.common_tags
}

# ---- CloudWatch Log Group ----
resource "aws_cloudwatch_log_group" "explainer" {
  name              = "/aws/lambda/${var.name_prefix}-explainer"
  retention_in_days = 30

  tags = var.common_tags
}

# ---- IAM Role ----
resource "aws_iam_role" "explainer" {
  name = "${var.name_prefix}-explainer-role"

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
resource "aws_iam_role_policy" "explainer" {
  name = "${var.name_prefix}-explainer-policy"
  role = aws_iam_role.explainer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/${var.bedrock_model_id}"
      },
      {
        Sid    = "DynamoDBWrite"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
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
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.explainer.arn}:*"
      }
    ]
  })
}
