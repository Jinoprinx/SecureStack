import boto3
import logging
from . import RemediationResult

logger = logging.getLogger(__name__)

def can_remediate(finding: dict) -> bool:
    generator_id = finding.get("GeneratorId", "")
    return any(rule in generator_id for rule in ["s3-bucket-public-read-prohibited", "s3-bucket-public-write-prohibited"])

def remediate(finding: dict, session=None) -> RemediationResult:
    s3 = session.client("s3") if session else boto3.client("s3")
    resources = finding.get("Resources", [])
    if not resources:
        raise ValueError("No S3 resources found in finding.")
        
    bucket_arn = resources[0].get("Id", "")
    bucket_name = bucket_arn.split(":::")[-1]
    
    logger.info(f"Remediating public access for bucket: {bucket_name}")
    
    # 1. Fetch current public access block state
    before_state = {}
    try:
        current_config = s3.get_public_access_block(Bucket=bucket_name)
        before_state = current_config.get("PublicAccessBlockConfiguration", {})
    except s3.exceptions.ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchPublicAccessBlockConfiguration":
            before_state = {"status": "NONE"}
        else:
            raise
            
    # 2. Put Public Access Block (block all public access)
    new_config = {
        "BlockPublicAcls": True,
        "IgnorePublicAcls": True,
        "BlockPublicPolicy": True,
        "RestrictPublicBuckets": True
    }
    s3.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration=new_config
    )
    
    # 3. Fetch after state
    after_state = s3.get_public_access_block(Bucket=bucket_name).get("PublicAccessBlockConfiguration", {})
    
    return RemediationResult(
        success=True,
        resource_id=bucket_name,
        action_taken="s3.put_public_access_block",
        before_state=before_state,
        after_state=after_state
    )
