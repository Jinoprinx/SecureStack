import json
import boto3
from boto3.dynamodb.conditions import Key

# Hardcoded framework controls structure based on standard CIS and SOC2 definitions
CIS_1_4_CONTROLS = [
    {"controlId": "1.4", "category": "IAM", "description": "Ensure no 'root' user account access key exists", "relatedRules": ["iam-root-access-key-check"]},
    {"controlId": "1.5", "category": "IAM", "description": "Ensure MFA is enabled for the 'root' user account", "relatedRules": ["root-account-mfa-enabled"]},
    {"controlId": "1.10", "category": "IAM", "description": "Ensure MFA is enabled for all IAM users", "relatedRules": ["iam-user-mfa-enabled"]},
    {"controlId": "1.8", "category": "IAM", "description": "Ensure strong IAM password policy", "relatedRules": ["iam-password-policy"]},
    {"controlId": "2.1.1", "category": "Storage", "description": "Ensure S3 bucket server-side encryption is enabled", "relatedRules": ["s3-bucket-server-side-encryption-enabled"]},
    {"controlId": "2.1.2", "category": "Storage", "description": "Ensure S3 bucket public access is blocked", "relatedRules": ["s3-bucket-public-read-prohibited", "s3-bucket-public-write-prohibited"]},
    {"controlId": "2.1.3", "category": "Storage", "description": "Ensure S3 bucket versioning is enabled", "relatedRules": ["s3-bucket-versioning-enabled"]},
    {"controlId": "2.2.1", "category": "Encryption", "description": "Ensure EBS volume encryption is enabled in all regions", "relatedRules": ["encrypted-volumes", "ec2-ebs-encryption-by-default"]},
    {"controlId": "2.3.1", "category": "Database", "description": "Ensure RDS instances are not publicly accessible", "relatedRules": ["rds-instance-public-access-check"]},
    {"controlId": "3.1", "category": "Logging", "description": "Ensure CloudTrail is enabled in all regions", "relatedRules": ["cloudtrail-enabled", "multi-region-cloud-trail-enabled"]},
    {"controlId": "5.1", "category": "Networking", "description": "Ensure no security groups allow ingress from 0.0.0.0/0 to port 22", "relatedRules": ["restricted-ssh"]},
    {"controlId": "5.4", "category": "Networking", "description": "Ensure default security group restricts all traffic", "relatedRules": ["vpc-default-security-group-closed"]}
]

SOC2_CONTROLS = [
    {"controlId": "CC6.1", "category": "Logical Access", "description": "Logical access controls (MFA, password rules)", "relatedRules": ["iam-user-mfa-enabled", "root-account-mfa-enabled", "iam-password-policy", "iam-root-access-key-check"]},
    {"controlId": "CC6.3", "category": "User Credentials", "description": "Least privilege and secure credential setup", "relatedRules": ["iam-root-access-key-check"]},
    {"controlId": "CC6.6", "category": "Boundary Protection", "description": "Boundary protections (VPCs, restricted ingress, public access blocks)", "relatedRules": ["s3-bucket-public-read-prohibited", "s3-bucket-public-write-prohibited", "restricted-ssh", "vpc-default-security-group-closed", "rds-instance-public-access-check"]},
    {"controlId": "CC6.7", "category": "Transmission Encryption", "description": "Data transmission encryption (SSL/TLS, S3 encryption)", "relatedRules": ["s3-bucket-server-side-encryption-enabled"]},
    {"controlId": "CC7.2", "category": "Monitoring & Audit", "description": "Continuous monitoring and audit logging (CloudTrail, VPC Flow Logs)", "relatedRules": ["cloudtrail-enabled", "multi-region-cloud-trail-enabled", "s3-bucket-versioning-enabled"]}
]

def handle_compliance_map(event, table_name, tenant_id):
    path_parameters = event.get("pathParameters") or {}
    framework = path_parameters.get("framework", "cis").lower()
    
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    
    # Query all findings scoped strictly to tenantId
    response = table.query(
        KeyConditionExpression=Key("tenantId").eq(tenant_id),
        ProjectionExpression="findingId, #status, generatorId, resourceId",
        ExpressionAttributeNames={"#status": "status"}
    )
    items = response.get("Items", [])
    
    # Build list of failing rule names and affected resources
    failing_rules = {}
    for item in items:
        if item.get("status") == "OPEN":
            gen_id = item.get("generatorId", "")
            rule_name = gen_id.split("/")[-1] if "/" in gen_id else gen_id
            
            if rule_name not in failing_rules:
                failing_rules[rule_name] = []
            failing_rules[rule_name].append(item.get("resourceId"))
            
    # Select framework control set
    controls = CIS_1_4_CONTROLS if framework == "cis" else SOC2_CONTROLS
    
    # Map findings to controls
    mapped_controls = []
    passing_count = 0
    
    for ctrl in controls:
        affected_resources = []
        is_failing = False
        
        for rule in ctrl["relatedRules"]:
            if rule in failing_rules:
                is_failing = True
                affected_resources.extend(failing_rules[rule])
                
        status = "FAIL" if is_failing else "PASS"
        if status == "PASS":
            passing_count += 1
            
        mapped_controls.append({
            "controlId": ctrl["controlId"],
            "category": ctrl["category"],
            "description": ctrl["description"],
            "status": status,
            "relatedRules": ctrl["relatedRules"],
            "resourcesAffected": list(set(affected_resources)) # Unique resources
        })
        
    compliance_percentage = int((passing_count / len(controls)) * 100) if controls else 100
    
    result = {
        "framework": framework,
        "compliancePercentage": compliance_percentage,
        "controls": mapped_controls
    }
    
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,OPTIONS"
        },
        "body": json.dumps(result)
    }
