# ---------------------------------------------------------------------------
# Locals — Common tags, naming conventions, and derived values
# Centralised here so every module uses a consistent naming scheme.
# ---------------------------------------------------------------------------

locals {
  # Standard prefix for all resource names: "securestack-dev"
  name_prefix = "${var.project_name}-${var.environment}"

  # Common tags applied to resources that don't inherit provider default_tags
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # AWS account ID — useful for building ARNs dynamically
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
}

# ---------------------------------------------------------------------------
# Data sources used by locals and shared across modules
# ---------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
