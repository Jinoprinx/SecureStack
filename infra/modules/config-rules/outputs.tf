# ---------------------------------------------------------------------------
# Outputs — Config Rules Module
# ---------------------------------------------------------------------------

output "config_recorder_id" {
  description = "ID of the AWS Config recorder"
  value       = aws_config_configuration_recorder.main.id
}

output "delivery_channel_id" {
  description = "ID of the Config delivery channel"
  value       = aws_config_delivery_channel.main.id
}

output "config_bucket_arn" {
  description = "ARN of the S3 bucket used for Config delivery"
  value       = aws_s3_bucket.config.arn
}

output "config_role_arn" {
  description = "ARN of the IAM role used by AWS Config"
  value       = aws_iam_role.config.arn
}

output "config_rule_arns" {
  description = "Map of Config rule names to their ARNs"
  value = {
    s3_encryption        = aws_config_config_rule.s3_encryption.arn
    s3_public_read       = aws_config_config_rule.s3_public_read.arn
    s3_public_write      = aws_config_config_rule.s3_public_write.arn
    s3_versioning        = aws_config_config_rule.s3_versioning.arn
    iam_root_access_key  = aws_config_config_rule.iam_root_access_key.arn
    iam_user_mfa         = aws_config_config_rule.iam_user_mfa.arn
    iam_password_policy  = aws_config_config_rule.iam_password_policy.arn
    restricted_ssh       = aws_config_config_rule.restricted_ssh.arn
    vpc_flow_logs        = aws_config_config_rule.vpc_flow_logs.arn
    ec2_in_vpc           = aws_config_config_rule.ec2_in_vpc.arn
    cloudtrail_cw_logs   = aws_config_config_rule.cloudtrail_cw_logs.arn
    cloudtrail_enabled   = aws_config_config_rule.cloudtrail_enabled.arn
    multi_region_ct      = aws_config_config_rule.multi_region_cloudtrail.arn
    encrypted_volumes    = aws_config_config_rule.encrypted_volumes.arn
    rds_encryption       = aws_config_config_rule.rds_encryption.arn
  }
}
