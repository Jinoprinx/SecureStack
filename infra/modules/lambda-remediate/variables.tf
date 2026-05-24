# ---------------------------------------------------------------------------
# Lambda Remediate Module — Variables
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

variable "tenants_table_arn" {
  description = "ARN of the DynamoDB tenants table"
  type        = string
}

variable "tenants_table_name" {
  description = "Name of the DynamoDB tenants table"
  type        = string
}

variable "sns_topic_arn" {
  description = "ARN of the SNS security alerts topic"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}
