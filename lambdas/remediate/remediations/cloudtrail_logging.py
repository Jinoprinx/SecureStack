import boto3
import logging
from . import RemediationResult

logger = logging.getLogger(__name__)

def can_remediate(finding: dict) -> bool:
    generator_id = finding.get("GeneratorId", "")
    return any(rule in generator_id for rule in ["cloudtrail-enabled", "multi-region-cloud-trail-enabled"])

def remediate(finding: dict, session=None) -> RemediationResult:
    resources = finding.get("Resources", [])
    if not resources:
        raise ValueError("No CloudTrail resources found in finding.")
        
    trail_arn = resources[0].get("Id", "")
    trail_name = trail_arn.split("/")[-1] if "/" in trail_arn else trail_arn
    region = resources[0].get("Region", "us-east-1")
    
    ct = session.client("cloudtrail", region_name=region) if session else boto3.client("cloudtrail", region_name=region)
    logger.info(f"Remediating CloudTrail: {trail_name} in region {region}")
    
    # 1. Fetch current trail configuration (Before State)
    trail_info = ct.describe_trails(TrailNameList=[trail_name])["trailList"][0]
    before_status = ct.get_trail_status(Name=trail_name)
    before_state = {
        "IsMultiRegionTrail": trail_info.get("IsMultiRegionTrail", False),
        "LogFileValidationEnabled": trail_info.get("LogFileValidationEnabled", False),
        "IsLogging": before_status.get("IsLogging", False)
    }
    
    # 2. Update Trail config & start logging
    ct.update_trail(
        Name=trail_name,
        IsMultiRegionTrail=True,
        EnableLogFileValidation=True
    )
    
    if not before_state["IsLogging"]:
        ct.start_logging(Name=trail_name)
        
    # 3. Fetch after state
    trail_info_after = ct.describe_trails(TrailNameList=[trail_name])["trailList"][0]
    after_status = ct.get_trail_status(Name=trail_name)
    after_state = {
        "IsMultiRegionTrail": trail_info_after.get("IsMultiRegionTrail", False),
        "LogFileValidationEnabled": trail_info_after.get("LogFileValidationEnabled", False),
        "IsLogging": after_status.get("IsLogging", False)
    }
    
    return RemediationResult(
        success=True,
        resource_id=trail_name,
        action_taken="cloudtrail.update_trail + cloudtrail.start_logging",
        before_state=before_state,
        after_state=after_state
    )
