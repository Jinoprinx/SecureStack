# ---------------------------------------------------------------------------
# Input Variables — SecureStack Compliance Engine
# ---------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region to deploy all resources into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name used in resource naming and tagging"
  type        = string
  default     = "securestack"
}

variable "slack_webhook_url" {
  description = "Slack incoming webhook URL for security alerts (leave empty to skip)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "alert_email" {
  description = "Email address for security alert notifications (leave empty to skip)"
  type        = string
  default     = ""
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock model ID for the AI explainer Lambda"
  type        = string
  default     = "anthropic.claude-3-sonnet-20240229-v1:0"
}

variable "enable_api_key" {
  description = "Whether to require an API key for the dashboard REST API"
  type        = bool
  default     = false
}

variable "dashboard_origin_url" {
  description = "Allowed origin URL for CORS (the dashboard frontend)"
  type        = string
  default     = "http://localhost:3000"
}
