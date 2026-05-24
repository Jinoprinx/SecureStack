# ---------------------------------------------------------------------------
# Root Module — SecureStack Self-Healing Compliance Engine
#
# This module wires together all child modules. The dependency graph is:
#
#   config-rules ──┐
#   security-hub ──┤
#   dynamodb ──────┼──► lambda-remediate ──┐
#   sns ───────────┤                       ├──► lambda-triage ──► eventbridge
#                  └──► lambda-explainer ──┘
#   api-gateway (standalone — reads DynamoDB)
#
# ---------------------------------------------------------------------------

# ===========================================================================
# 1. AWS Config — Compliance rules engine
# ===========================================================================
module "config_rules" {
  source = "./modules/config-rules"

  name_prefix = local.name_prefix
  common_tags = local.common_tags
}

# ===========================================================================
# 2. Security Hub — Centralised security findings aggregator
# ===========================================================================
module "security_hub" {
  source = "./modules/security-hub"

  name_prefix = local.name_prefix
  common_tags = local.common_tags
}

# ===========================================================================
# 3. DynamoDB — Findings and remediation history store
# ===========================================================================
module "dynamodb" {
  source = "./modules/dynamodb"

  name_prefix = local.name_prefix
  table_name  = "${local.name_prefix}-findings"
  common_tags = local.common_tags
}

# ===========================================================================
# 4. SNS — Security alert notifications
# ===========================================================================
module "sns" {
  source = "./modules/sns"

  name_prefix       = local.name_prefix
  alert_email       = var.alert_email
  slack_webhook_url = var.slack_webhook_url
  common_tags       = local.common_tags
}

# ===========================================================================
# 5. Lambda — Remediation (must be created before Triage, which invokes it)
# ===========================================================================
module "lambda_remediate" {
  source = "./modules/lambda-remediate"

  name_prefix         = local.name_prefix
  dynamodb_table_arn  = module.dynamodb.table_arn
  dynamodb_table_name = module.dynamodb.table_name
  tenants_table_arn   = module.dynamodb.tenants_table_arn
  tenants_table_name  = module.dynamodb.tenants_table_name
  sns_topic_arn       = module.sns.topic_arn
  environment         = var.environment
  common_tags         = local.common_tags
}

# ===========================================================================
# 6. Lambda — AI Explainer (must be created before Triage, which invokes it)
# ===========================================================================
module "lambda_explainer" {
  source = "./modules/lambda-explainer"

  name_prefix        = local.name_prefix
  dynamodb_table_arn = module.dynamodb.table_arn
  dynamodb_table_name = module.dynamodb.table_name
  sns_topic_arn      = module.sns.topic_arn
  bedrock_model_id   = var.bedrock_model_id
  environment        = var.environment
  common_tags        = local.common_tags
}

# ===========================================================================
# 7. Lambda — Triage (orchestrator — invokes remediate + explainer)
# ===========================================================================
module "lambda_triage" {
  source = "./modules/lambda-triage"

  name_prefix          = local.name_prefix
  dynamodb_table_arn   = module.dynamodb.table_arn
  dynamodb_table_name  = module.dynamodb.table_name
  tenants_table_arn    = module.dynamodb.tenants_table_arn
  tenants_table_name   = module.dynamodb.tenants_table_name
  sns_topic_arn        = module.sns.topic_arn
  lambda_remediate_arn = module.lambda_remediate.function_arn
  lambda_explainer_arn = module.lambda_explainer.function_arn
  environment          = var.environment
  common_tags          = local.common_tags
}

# ===========================================================================
# 8. EventBridge — Routes Security Hub events to Lambda Triage
# ===========================================================================
module "eventbridge" {
  source = "./modules/eventbridge"

  name_prefix                = local.name_prefix
  lambda_triage_arn          = module.lambda_triage.function_arn
  lambda_triage_function_name = module.lambda_triage.function_name
  common_tags                = local.common_tags
}

# ===========================================================================
# 9. API Gateway — Dashboard REST API
# ===========================================================================
module "api_gateway" {
  source = "./modules/api-gateway"

  name_prefix          = local.name_prefix
  dynamodb_table_arn   = module.dynamodb.table_arn
  dynamodb_table_name  = module.dynamodb.table_name
  tenants_table_arn    = module.dynamodb.tenants_table_arn
  tenants_table_name   = module.dynamodb.tenants_table_name
  enable_api_key       = var.enable_api_key
  dashboard_origin_url = var.dashboard_origin_url
  environment          = var.environment
  common_tags          = local.common_tags
}
