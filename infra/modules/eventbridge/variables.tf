# ---------------------------------------------------------------------------
# EventBridge Module — Variables
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

variable "lambda_triage_arn" {
  description = "ARN of the Lambda Triage function (target for EventBridge rules)"
  type        = string
}

variable "lambda_triage_function_name" {
  description = "Name of the Lambda Triage function (for invoke permission)"
  type        = string
}
