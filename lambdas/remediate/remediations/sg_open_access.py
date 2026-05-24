import boto3
import logging
from . import RemediationResult

logger = logging.getLogger(__name__)

def can_remediate(finding: dict) -> bool:
    generator_id = finding.get("GeneratorId", "")
    return "restricted-ssh" in generator_id or "INCOMING_SSH_DISABLED" in generator_id

def remediate(finding: dict, session=None) -> RemediationResult:
    resources = finding.get("Resources", [])
    if not resources:
        raise ValueError("No security group resources found in finding.")
        
    sg_arn = resources[0].get("Id", "")
    # Format of SG ARN is usually arn:aws:ec2:region:account:security-group/sg-id
    # Or just the SG ID itself.
    sg_id = sg_arn.split("/")[-1] if "/" in sg_arn else sg_arn
    region = resources[0].get("Region", "us-east-1")
    
    ec2 = session.client("ec2", region_name=region) if session else boto3.client("ec2", region_name=region)
    logger.info(f"Remediating open ports for Security Group: {sg_id} in {region}")
    
    # 1. Fetch current security group details
    sg_details = ec2.describe_security_groups(GroupIds=[sg_id])["SecurityGroups"][0]
    before_state = {"IpPermissions": sg_details.get("IpPermissions", [])}
    
    # Find rules that open port 22 or 3389 to 0.0.0.0/0 or ::/0
    rules_to_revoke = []
    for permission in sg_details.get("IpPermissions", []):
        from_port = permission.get("FromPort")
        to_port = permission.get("ToPort")
        
        # Check if port matches SSH (22) or RDP (3389) or is a wide range including them
        port_match = False
        if from_port is not None and to_port is not None:
            if (from_port <= 22 <= to_port) or (from_port <= 3389 <= to_port):
                port_match = True
        
        if port_match:
            ranges_to_revoke = []
            ipv6_ranges_to_revoke = []
            
            for ip_range in permission.get("IpRanges", []):
                if ip_range.get("CidrIp") == "0.0.0.0/0":
                    ranges_to_revoke.append(ip_range)
                    
            for ipv6_range in permission.get("Ipv6Ranges", []):
                if ipv6_range.get("CidrIpv6") == "::/0":
                    ipv6_ranges_to_revoke.append(ipv6_range)
                    
            if ranges_to_revoke or ipv6_ranges_to_revoke:
                # We need to revoke this permission for these specific ranges
                revoke_permission = permission.copy()
                if ranges_to_revoke:
                    revoke_permission["IpRanges"] = ranges_to_revoke
                else:
                    revoke_permission.pop("IpRanges", None)
                    
                if ipv6_ranges_to_revoke:
                    revoke_permission["Ipv6Ranges"] = ipv6_ranges_to_revoke
                else:
                    revoke_permission.pop("Ipv6Ranges", None)
                
                # Clean up metadata keys boto3 doesn't like for revoking
                revoke_permission.pop("UserIdGroupPairs", None)
                revoke_permission.pop("PrefixListIds", None)
                
                rules_to_revoke.append(revoke_permission)
                
    if not rules_to_revoke:
        logger.info(f"No rules opening port 22/3389 to 0.0.0.0/0 found in security group {sg_id}")
        return RemediationResult(
            success=True,
            resource_id=sg_id,
            action_taken="none",
            before_state=before_state,
            after_state=before_state
        )
        
    # 2. Revoke the open rules
    ec2.revoke_security_group_ingress(
        GroupId=sg_id,
        IpPermissions=rules_to_revoke
    )
    
    # 3. Fetch after state
    sg_details_after = ec2.describe_security_groups(GroupIds=[sg_id])["SecurityGroups"][0]
    after_state = {"IpPermissions": sg_details_after.get("IpPermissions", [])}
    
    return RemediationResult(
        success=True,
        resource_id=sg_id,
        action_taken="ec2.revoke_security_group_ingress",
        before_state=before_state,
        after_state=after_state
    )
