# ---------------------------------------------------------------------------
# API Gateway Module — Variables
# ---------------------------------------------------------------------------

variable "name_prefix" {
  description = "Naming prefix for all resources"
  type        = string
}

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB findings table"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB findings table"
  type        = string
}

variable "enable_api_key" {
  description = "Whether to require an API key for the REST API"
  type        = bool
  default     = false
}

variable "dashboard_origin_url" {
  description = "Allowed origin URL for CORS headers"
  type        = string
  default     = "http://localhost:3000"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "tenants_table_arn" {
  description = "ARN of the DynamoDB tenants table"
  type        = string
}

variable "tenants_table_name" {
  description = "Name of the DynamoDB tenants table"
  type        = string
}
