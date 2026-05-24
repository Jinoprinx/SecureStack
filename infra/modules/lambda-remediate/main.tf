# ---------------------------------------------------------------------------
# Lambda Remediate Module — Main
# Auto-remediates common misconfigurations detected by Security Hub.
# Has broad permissions because it needs to FIX S3, EC2, CloudTrail, etc.
# ---------------------------------------------------------------------------

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ---- Package the Lambda source code ----
data "archive_file" "remediate" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambdas/remediate/"
  output_path = "${path.module}/../../../.build/remediate.zip"
}

# ---- Lambda Function ----
resource "aws_lambda_function" "remediate" {
  function_name    = "${var.name_prefix}-remediate"
  description      = "Auto-remediates common Security Hub findings (S3, EC2, CloudTrail)"
  filename         = data.archive_file.remediate.output_path
  source_code_hash = data.archive_file.remediate.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 256
  timeout          = 30
  role             = aws_iam_role.remediate.arn

  environment {
    variables = {
      DYNAMODB_TABLE   = var.dynamodb_table_name
      DYNAMODB_TENANTS = var.tenants_table_name
      SNS_TOPIC_ARN    = var.sns_topic_arn
      ENVIRONMENT      = var.environment
    }
  }

  tags = var.common_tags
}

# ---- CloudWatch Log Group ----
resource "aws_cloudwatch_log_group" "remediate" {
  name              = "/aws/lambda/${var.name_prefix}-remediate"
  retention_in_days = 30

  tags = var.common_tags
}

# ---- IAM Role ----
resource "aws_iam_role" "remediate" {
  name = "${var.name_prefix}-remediate-role"

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

# ---- Remediation policy — needs broad permissions to fix misconfigurations ----
resource "aws_iam_role_policy" "remediate" {
  name = "${var.name_prefix}-remediate-policy"
  role = aws_iam_role.remediate.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Remediation"
        Effect = "Allow"
        Action = [
          "s3:PutBucketVersioning",
          "s3:PutEncryptionConfiguration",
          "s3:PutBucketPublicAccessBlock",
          "s3:PutBucketPolicy",
          "s3:GetBucketPolicy",
          "s3:GetBucketVersioning",
          "s3:GetEncryptionConfiguration",
          "s3:GetBucketPublicAccessBlock",
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::*"
      },
      {
        Sid    = "EC2Remediation"
        Effect = "Allow"
        Action = [
          "ec2:RevokeSecurityGroupIngress",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSecurityGroupRules",
          "ec2:ModifyInstanceAttribute",
          "ec2:DescribeInstances",
          "ec2:CreateFlowLogs",
          "ec2:DescribeFlowLogs",
          "ec2:DescribeVpcs"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudTrailRemediation"
        Effect = "Allow"
        Action = [
          "cloudtrail:CreateTrail",
          "cloudtrail:StartLogging",
          "cloudtrail:UpdateTrail",
          "cloudtrail:DescribeTrails",
          "cloudtrail:GetTrailStatus"
        ]
        Resource = "*"
      },
      {
        Sid    = "SecurityHubUpdate"
        Effect = "Allow"
        Action = [
          "securityhub:BatchUpdateFindings"
        ]
        Resource = "arn:aws:securityhub:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:hub/default"
      },
      {
        Sid    = "DynamoDBUpdate"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
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
        Sid    = "STSAssumeRole"
        Effect = "Allow"
        Action = [
          "sts:AssumeRole"
        ]
        Resource = "*"
      },
      {
        Sid    = "SNSNotify"
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
        Resource = "${aws_cloudwatch_log_group.remediate.arn}:*"
      },
      {
        Sid    = "IAMForFlowLogs"
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.name_prefix}-*"
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "vpc-flow-logs.amazonaws.com"
          }
        }
      }
    ]
  })
}
