# ---------------------------------------------------------------------------
# DynamoDB Module — Main
# Partitioned findings table and tenants configuration table.
# PAY_PER_REQUEST billing keeps costs proportional to actual usage.
# ---------------------------------------------------------------------------

resource "aws_dynamodb_table" "findings" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenantId"
  range_key    = "findingId"

  # ---- Primary key attributes ----
  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "findingId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "severity"
    type = "S"
  }

  attribute {
    name = "complianceFramework"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # ---- GSI 1: Query findings by tenant and severity ----
  global_secondary_index {
    name            = "severity-index"
    hash_key        = "tenantId"
    range_key       = "severity"
    projection_type = "ALL"
  }

  # ---- GSI 2: Query findings by tenant and compliance framework ----
  global_secondary_index {
    name            = "compliance-index"
    hash_key        = "tenantId"
    range_key       = "complianceFramework"
    projection_type = "ALL"
  }

  # ---- GSI 3: Query findings by tenant and remediation status ----
  global_secondary_index {
    name            = "status-index"
    hash_key        = "tenantId"
    range_key       = "status"
    projection_type = "ALL"
  }

  # ---- GSI 4: Query findings by tenant and timestamp (chronological) ----
  global_secondary_index {
    name            = "timestamp-index"
    hash_key        = "tenantId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # Point-in-time recovery protects against accidental deletes
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption with AWS-managed key (free tier)
  server_side_encryption {
    enabled = true
  }

  tags = var.common_tags
}

resource "aws_dynamodb_table" "tenants" {
  name         = "${var.table_name}-tenants"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenantId"
  range_key    = "accountId"

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "accountId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.common_tags
}

