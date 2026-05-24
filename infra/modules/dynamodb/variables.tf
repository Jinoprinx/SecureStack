# ---------------------------------------------------------------------------
# DynamoDB Module — Variables
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

variable "table_name" {
  description = "Name of the DynamoDB findings table"
  type        = string
  default     = "securestack-findings"
}
