# ---------------------------------------------------------------------------
# API Gateway Module — Main
# REST API for the SecureStack dashboard with Lambda proxy integration.
#
# Routes:
#   GET /findings
#   GET /posture-score
#   GET /compliance/{framework}
#   GET /remediation-history
#   GET /trends
#
# Each route proxies to a single API Lambda. CORS is enabled for the
# dashboard origin. An optional API key + usage plan gates access.
# ---------------------------------------------------------------------------

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ---- Package the API Lambda source code ----
data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambdas/api/"
  output_path = "${path.module}/../../../.build/api.zip"
}

# ===========================================================================
# API Lambda Function
# ===========================================================================

resource "aws_lambda_function" "api" {
  function_name    = "${var.name_prefix}-api"
  description      = "Dashboard API Lambda — serves findings, posture score, compliance, trends"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 256
  timeout          = 30
  role             = aws_iam_role.api.arn

  environment {
    variables = {
      DYNAMODB_TABLE   = var.dynamodb_table_name
      DYNAMODB_TENANTS = var.tenants_table_name
      ENVIRONMENT      = var.environment
    }
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.name_prefix}-api"
  retention_in_days = 30

  tags = var.common_tags
}

# ---- API Lambda IAM Role ----
resource "aws_iam_role" "api" {
  name = "${var.name_prefix}-api-role"

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

resource "aws_iam_role_policy" "api" {
  name = "${var.name_prefix}-api-policy"
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBReadWrite"
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*",
          var.tenants_table_arn,
          "${var.tenants_table_arn}/index/*"
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.api.arn}:*"
      }
    ]
  })
}

# ===========================================================================
# REST API
# ===========================================================================

resource "aws_api_gateway_rest_api" "dashboard" {
  name        = "${var.name_prefix}-dashboard-api"
  description = "SecureStack Dashboard REST API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.common_tags
}

# ---------------------------------------------------------------------------
# /findings
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "findings" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_rest_api.dashboard.root_resource_id
  path_part   = "findings"
}

resource "aws_api_gateway_method" "findings_get" {
  rest_api_id      = aws_api_gateway_rest_api.dashboard.id
  resource_id      = aws_api_gateway_resource.findings.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = var.enable_api_key
}

resource "aws_api_gateway_integration" "findings_get" {
  rest_api_id             = aws_api_gateway_rest_api.dashboard.id
  resource_id             = aws_api_gateway_resource.findings.id
  http_method             = aws_api_gateway_method.findings_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

# CORS — OPTIONS preflight for /findings
resource "aws_api_gateway_method" "findings_options" {
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  resource_id   = aws_api_gateway_resource.findings.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "findings_options" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.findings.id
  http_method = aws_api_gateway_method.findings_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "findings_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.findings.id
  http_method = aws_api_gateway_method.findings_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "findings_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.findings.id
  http_method = aws_api_gateway_method.findings_options.http_method
  status_code = aws_api_gateway_method_response.findings_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin_url}'"
  }
}

# ---------------------------------------------------------------------------
# /posture-score
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "posture_score" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_rest_api.dashboard.root_resource_id
  path_part   = "posture-score"
}

resource "aws_api_gateway_method" "posture_score_get" {
  rest_api_id      = aws_api_gateway_rest_api.dashboard.id
  resource_id      = aws_api_gateway_resource.posture_score.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = var.enable_api_key
}

resource "aws_api_gateway_integration" "posture_score_get" {
  rest_api_id             = aws_api_gateway_rest_api.dashboard.id
  resource_id             = aws_api_gateway_resource.posture_score.id
  http_method             = aws_api_gateway_method.posture_score_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method" "posture_score_options" {
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  resource_id   = aws_api_gateway_resource.posture_score.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "posture_score_options" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.posture_score.id
  http_method = aws_api_gateway_method.posture_score_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "posture_score_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.posture_score.id
  http_method = aws_api_gateway_method.posture_score_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "posture_score_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.posture_score.id
  http_method = aws_api_gateway_method.posture_score_options.http_method
  status_code = aws_api_gateway_method_response.posture_score_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin_url}'"
  }
}

# ---------------------------------------------------------------------------
# /compliance/{framework}
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "compliance" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_rest_api.dashboard.root_resource_id
  path_part   = "compliance"
}

resource "aws_api_gateway_resource" "compliance_framework" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_resource.compliance.id
  path_part   = "{framework}"
}

resource "aws_api_gateway_method" "compliance_get" {
  rest_api_id      = aws_api_gateway_rest_api.dashboard.id
  resource_id      = aws_api_gateway_resource.compliance_framework.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = var.enable_api_key

  request_parameters = {
    "method.request.path.framework" = true
  }
}

resource "aws_api_gateway_integration" "compliance_get" {
  rest_api_id             = aws_api_gateway_rest_api.dashboard.id
  resource_id             = aws_api_gateway_resource.compliance_framework.id
  http_method             = aws_api_gateway_method.compliance_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method" "compliance_options" {
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  resource_id   = aws_api_gateway_resource.compliance_framework.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "compliance_options" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.compliance_framework.id
  http_method = aws_api_gateway_method.compliance_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "compliance_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.compliance_framework.id
  http_method = aws_api_gateway_method.compliance_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "compliance_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.compliance_framework.id
  http_method = aws_api_gateway_method.compliance_options.http_method
  status_code = aws_api_gateway_method_response.compliance_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin_url}'"
  }
}

# ---------------------------------------------------------------------------
# /remediation-history
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "remediation_history" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_rest_api.dashboard.root_resource_id
  path_part   = "remediation-history"
}

resource "aws_api_gateway_method" "remediation_history_get" {
  rest_api_id      = aws_api_gateway_rest_api.dashboard.id
  resource_id      = aws_api_gateway_resource.remediation_history.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = var.enable_api_key
}

resource "aws_api_gateway_integration" "remediation_history_get" {
  rest_api_id             = aws_api_gateway_rest_api.dashboard.id
  resource_id             = aws_api_gateway_resource.remediation_history.id
  http_method             = aws_api_gateway_method.remediation_history_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method" "remediation_history_options" {
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  resource_id   = aws_api_gateway_resource.remediation_history.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "remediation_history_options" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.remediation_history.id
  http_method = aws_api_gateway_method.remediation_history_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "remediation_history_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.remediation_history.id
  http_method = aws_api_gateway_method.remediation_history_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "remediation_history_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.remediation_history.id
  http_method = aws_api_gateway_method.remediation_history_options.http_method
  status_code = aws_api_gateway_method_response.remediation_history_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin_url}'"
  }
}

# ---------------------------------------------------------------------------
# /trends
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "trends" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_rest_api.dashboard.root_resource_id
  path_part   = "trends"
}

resource "aws_api_gateway_method" "trends_get" {
  rest_api_id      = aws_api_gateway_rest_api.dashboard.id
  resource_id      = aws_api_gateway_resource.trends.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = var.enable_api_key
}

resource "aws_api_gateway_integration" "trends_get" {
  rest_api_id             = aws_api_gateway_rest_api.dashboard.id
  resource_id             = aws_api_gateway_resource.trends.id
  http_method             = aws_api_gateway_method.trends_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method" "trends_options" {
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  resource_id   = aws_api_gateway_resource.trends.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "trends_options" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.trends.id
  http_method = aws_api_gateway_method.trends_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "trends_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.trends.id
  http_method = aws_api_gateway_method.trends_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "trends_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.trends.id
  http_method = aws_api_gateway_method.trends_options.http_method
  status_code = aws_api_gateway_method_response.trends_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Tenant-Id'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin_url}'"
  }
}

# ---------------------------------------------------------------------------
# /tenants and /tenants/connect
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "tenants" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_rest_api.dashboard.root_resource_id
  path_part   = "tenants"
}

resource "aws_api_gateway_method" "tenants_get" {
  rest_api_id      = aws_api_gateway_rest_api.dashboard.id
  resource_id      = aws_api_gateway_resource.tenants.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = var.enable_api_key
}

resource "aws_api_gateway_integration" "tenants_get" {
  rest_api_id             = aws_api_gateway_rest_api.dashboard.id
  resource_id             = aws_api_gateway_resource.tenants.id
  http_method             = aws_api_gateway_method.tenants_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method" "tenants_options" {
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  resource_id   = aws_api_gateway_resource.tenants.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tenants_options" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.tenants.id
  http_method = aws_api_gateway_method.tenants_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "tenants_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.tenants.id
  http_method = aws_api_gateway_method.tenants_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "tenants_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.tenants.id
  http_method = aws_api_gateway_method.tenants_options.http_method
  status_code = aws_api_gateway_method_response.tenants_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Tenant-Id'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin_url}'"
  }
}

resource "aws_api_gateway_resource" "tenants_connect" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  parent_id   = aws_api_gateway_resource.tenants.id
  path_part   = "connect"
}

resource "aws_api_gateway_method" "tenants_connect_post" {
  rest_api_id      = aws_api_gateway_rest_api.dashboard.id
  resource_id      = aws_api_gateway_resource.tenants_connect.id
  http_method      = "POST"
  authorization    = "NONE"
  api_key_required = var.enable_api_key
}

resource "aws_api_gateway_integration" "tenants_connect_post" {
  rest_api_id             = aws_api_gateway_rest_api.dashboard.id
  resource_id             = aws_api_gateway_resource.tenants_connect.id
  http_method             = aws_api_gateway_method.tenants_connect_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method" "tenants_connect_options" {
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  resource_id   = aws_api_gateway_resource.tenants_connect.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tenants_connect_options" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.tenants_connect.id
  http_method = aws_api_gateway_method.tenants_connect_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "tenants_connect_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.tenants_connect.id
  http_method = aws_api_gateway_method.tenants_connect_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "tenants_connect_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id
  resource_id = aws_api_gateway_resource.tenants_connect.id
  http_method = aws_api_gateway_method.tenants_connect_options.http_method
  status_code = aws_api_gateway_method_response.tenants_connect_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Tenant-Id'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin_url}'"
  }
}

# ===========================================================================
# Deployment + Stage
# ===========================================================================

resource "aws_api_gateway_deployment" "dashboard" {
  rest_api_id = aws_api_gateway_rest_api.dashboard.id

  # Redeploy whenever any method or integration changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.findings.id,
      aws_api_gateway_method.findings_get.id,
      aws_api_gateway_integration.findings_get.id,
      aws_api_gateway_resource.posture_score.id,
      aws_api_gateway_method.posture_score_get.id,
      aws_api_gateway_integration.posture_score_get.id,
      aws_api_gateway_resource.compliance_framework.id,
      aws_api_gateway_method.compliance_get.id,
      aws_api_gateway_integration.compliance_get.id,
      aws_api_gateway_resource.remediation_history.id,
      aws_api_gateway_method.remediation_history_get.id,
      aws_api_gateway_integration.remediation_history_get.id,
      aws_api_gateway_resource.trends.id,
      aws_api_gateway_method.trends_get.id,
      aws_api_gateway_integration.trends_get.id,
      aws_api_gateway_resource.tenants.id,
      aws_api_gateway_method.tenants_get.id,
      aws_api_gateway_integration.tenants_get.id,
      aws_api_gateway_resource.tenants_connect.id,
      aws_api_gateway_method.tenants_connect_post.id,
      aws_api_gateway_integration.tenants_connect_post.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "dashboard" {
  deployment_id = aws_api_gateway_deployment.dashboard.id
  rest_api_id   = aws_api_gateway_rest_api.dashboard.id
  stage_name    = var.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      requestTime    = "$context.requestTime"
    })
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.name_prefix}-dashboard"
  retention_in_days = 30

  tags = var.common_tags
}

# ===========================================================================
# Lambda Permission — allow API Gateway to invoke the API Lambda
# ===========================================================================

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dashboard.execution_arn}/*/*"
}

# ===========================================================================
# Optional API Key + Usage Plan
# ===========================================================================

resource "aws_api_gateway_api_key" "dashboard" {
  count = var.enable_api_key ? 1 : 0

  name    = "${var.name_prefix}-dashboard-key"
  enabled = true

  tags = var.common_tags
}

resource "aws_api_gateway_usage_plan" "dashboard" {
  count = var.enable_api_key ? 1 : 0

  name = "${var.name_prefix}-dashboard-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.dashboard.id
    stage  = aws_api_gateway_stage.dashboard.stage_name
  }

  # Reasonable defaults — adjust for production traffic
  throttle_settings {
    burst_limit = 50
    rate_limit  = 100
  }

  quota_settings {
    limit  = 10000
    period = "DAY"
  }

  tags = var.common_tags
}

resource "aws_api_gateway_usage_plan_key" "dashboard" {
  count = var.enable_api_key ? 1 : 0

  key_id        = aws_api_gateway_api_key.dashboard[0].id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.dashboard[0].id
}
