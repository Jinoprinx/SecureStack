# ---------------------------------------------------------------------------
# SNS Module — Variables
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

variable "alert_email" {
  description = "Email address for security alert notifications (leave empty to skip)"
  type        = string
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack incoming webhook URL for security alerts (leave empty to skip)"
  type        = string
  default     = ""
  sensitive   = true
}
