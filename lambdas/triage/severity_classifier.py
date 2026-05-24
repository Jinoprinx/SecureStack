import logging

logger = logging.getLogger(__name__)

# Actions definition
ACTION_AUTO_REMEDIATE = "AUTO_REMEDIATE"
ACTION_EXPLAIN_AND_ALERT = "EXPLAIN_AND_ALERT"
ACTION_LOG_ONLY = "LOG_ONLY"

# Map Config generator/rule IDs to specific actions
RULE_ACTION_MAP = {
    # S3 rules (safe for auto-remediation)
    "s3-bucket-server-side-encryption-enabled": ACTION_AUTO_REMEDIATE,
    "s3-bucket-public-read-prohibited": ACTION_AUTO_REMEDIATE,
    "s3-bucket-public-write-prohibited": ACTION_AUTO_REMEDIATE,
    "s3-bucket-versioning-enabled": ACTION_AUTO_REMEDIATE,
    
    # EBS rules
    "encrypted-volumes": ACTION_AUTO_REMEDIATE,
    "ec2-ebs-encryption-by-default": ACTION_AUTO_REMEDIATE,
    
    # CloudTrail rules
    "cloudtrail-enabled": ACTION_AUTO_REMEDIATE,
    "multi-region-cloud-trail-enabled": ACTION_AUTO_REMEDIATE,
    
    # IAM rules (always require review/alerting due to high potential business disruption)
    "iam-root-access-key-check": ACTION_EXPLAIN_AND_ALERT,
    "iam-user-mfa-enabled": ACTION_EXPLAIN_AND_ALERT,
    "iam-password-policy": ACTION_EXPLAIN_AND_ALERT,
    "root-account-mfa-enabled": ACTION_EXPLAIN_AND_ALERT,
    
    # Port restrictions / Networking (usually require alert or manual intervention)
    "restricted-ssh": ACTION_EXPLAIN_AND_ALERT,
    "vpc-default-security-group-closed": ACTION_EXPLAIN_AND_ALERT,
    "rds-instance-public-access-check": ACTION_EXPLAIN_AND_ALERT
}

def classify_finding(finding: dict) -> str:
    """
    Classify finding and determine what action to take based on rule ID and severity.
    """
    generator_id = finding.get("GeneratorId", "")
    # Standardize generator id (e.g. extracts rule-name from aws-config-rule/rule-name)
    rule_name = generator_id.split("/")[-1] if "/" in generator_id else generator_id
    
    severity_label = finding.get("Severity", {}).get("Label", "INFORMATIONAL")
    compliance_status = finding.get("Compliance", {}).get("Status", "WARNING")
    
    logger.info(f"Classifying finding: Rule={rule_name}, Severity={severity_label}, Compliance={compliance_status}")
    
    # If the resource is compliant, we just log it
    if compliance_status == "PASSED":
        return ACTION_LOG_ONLY
        
    # Check if we have an explicit mapping for this rule
    if rule_name in RULE_ACTION_MAP:
        return RULE_ACTION_MAP[rule_name]
        
    # Default fallbacks based on severity
    if severity_label in ["CRITICAL", "HIGH"]:
        return ACTION_EXPLAIN_AND_ALERT
    elif severity_label in ["MEDIUM", "LOW"]:
        return ACTION_EXPLAIN_AND_ALERT # Default is explain to be safe
    else:
        return ACTION_LOG_ONLY
