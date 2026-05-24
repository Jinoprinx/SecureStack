import boto3
import logging
from . import RemediationResult

logger = logging.getLogger(__name__)

def can_remediate(finding: dict) -> bool:
    generator_id = finding.get("GeneratorId", "")
    return any(rule in generator_id for rule in ["encrypted-volumes", "ec2-ebs-encryption-by-default"])

def remediate(finding: dict, session=None) -> RemediationResult:
    # Extract the region of the resource
    resources = finding.get("Resources", [])
    region = "us-east-1"
    if resources:
        region = resources[0].get("Region", "us-east-1")
        
    ec2 = session.client("ec2", region_name=region) if session else boto3.client("ec2", region_name=region)
    
    logger.info(f"Remediating default EBS encryption in region: {region}")
    
    # 1. Fetch current default encryption state
    current_status = ec2.get_ebs_encryption_by_default()
    before_state = {"EbsEncryptionByDefault": current_status.get("EbsEncryptionByDefault", False)}
    
    # 2. Enable EBS encryption by default
    ec2.enable_ebs_encryption_by_default()
    
    # 3. Fetch after state
    after_status = ec2.get_ebs_encryption_by_default()
    after_state = {"EbsEncryptionByDefault": after_status.get("EbsEncryptionByDefault", False)}
    
    return RemediationResult(
        success=True,
        resource_id=region,
        action_taken="ec2.enable_ebs_encryption_by_default",
        before_state=before_state,
        after_state=after_state
    )
