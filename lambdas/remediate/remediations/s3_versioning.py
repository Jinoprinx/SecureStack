import boto3
import logging
from . import RemediationResult

logger = logging.getLogger(__name__)

def can_remediate(finding: dict) -> bool:
    generator_id = finding.get("GeneratorId", "")
    return "s3-bucket-versioning-enabled" in generator_id

def remediate(finding: dict, session=None) -> RemediationResult:
    s3 = session.client("s3") if session else boto3.client("s3")
    resources = finding.get("Resources", [])
    if not resources:
        raise ValueError("No S3 resources found in finding.")
        
    bucket_arn = resources[0].get("Id", "")
    bucket_name = bucket_arn.split(":::")[-1]
    
    logger.info(f"Remediating versioning for S3 bucket: {bucket_name}")
    
    # 1. Fetch current versioning status
    before_status = s3.get_bucket_versioning(Bucket=bucket_name)
    before_state = {"status": before_status.get("Status", "Suspended")}
    
    # 2. Enable versioning
    s3.put_bucket_versioning(
        Bucket=bucket_name,
        VersioningConfiguration={
            "Status": "Enabled"
        }
    )
    
    # 3. Fetch after status
    after_status = s3.get_bucket_versioning(Bucket=bucket_name)
    after_state = {"status": after_status.get("Status", "Suspended")}
    
    return RemediationResult(
        success=True,
        resource_id=bucket_name,
        action_taken="s3.put_bucket_versioning",
        before_state=before_state,
        after_state=after_state
    )
