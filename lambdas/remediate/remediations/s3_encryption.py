import boto3
import logging
from . import RemediationResult

logger = logging.getLogger(__name__)

def can_remediate(finding: dict) -> bool:
    generator_id = finding.get("GeneratorId", "")
    return "s3-bucket-server-side-encryption-enabled" in generator_id

def remediate(finding: dict, session=None) -> RemediationResult:
    s3 = session.client("s3") if session else boto3.client("s3")
    resources = finding.get("Resources", [])
    if not resources:
        raise ValueError("No S3 resources found in finding.")
        
    bucket_arn = resources[0].get("Id", "")
    bucket_name = bucket_arn.split(":::")[-1]
    
    logger.info(f"Remediating S3 Server-Side Encryption for bucket: {bucket_name}")
    
    # 1. Fetch current encryption config (Before State)
    before_state = {}
    try:
        current_encryption = s3.get_bucket_encryption(Bucket=bucket_name)
        before_state = current_encryption.get("ServerSideEncryptionConfiguration", {})
    except s3.exceptions.ClientError as e:
        if e.response["Error"]["Code"] == "ServerSideEncryptionConfigurationNotFoundError":
            before_state = {"status": "NONE"}
        else:
            raise
            
    # 2. Apply encryption (AES-256 SSE-S3 with bucket key enabled)
    s3.put_bucket_encryption(
        Bucket=bucket_name,
        ServerSideEncryptionConfiguration={
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    },
                    "BucketKeyEnabled": True
                }
            ]
        }
    )
    
    # 3. Verify encryption (After State)
    after_state = s3.get_bucket_encryption(Bucket=bucket_name).get("ServerSideEncryptionConfiguration", {})
    
    return RemediationResult(
        success=True,
        resource_id=bucket_name,
        action_taken="s3.put_bucket_encryption",
        before_state=before_state,
        after_state=after_state
    )
