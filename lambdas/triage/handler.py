import json
import os
import logging
import boto3
from datetime import datetime
from severity_classifier import classify_finding

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS SDK clients
dynamodb = boto3.resource("dynamodb")
lambda_client = boto3.client("lambda")
sns = boto3.client("sns")

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "securestack-findings")
REMEDIATE_FUNCTION_ARN = os.environ.get("REMEDIATE_FUNCTION_ARN")
EXPLAINER_FUNCTION_ARN = os.environ.get("EXPLAINER_FUNCTION_ARN")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Check if the event comes from Security Hub EventBridge
    detail = event.get("detail", {})
    findings = detail.get("findings", [])
    
    if not findings:
        logger.warning("No findings found in the event.")
        return {"statusCode": 400, "body": "No findings found in the event."}
        
    processed_count = 0
    
    for finding in findings:
        try:
            # Extract key fields
            finding_id = finding.get("Id")
            severity = finding.get("Severity", {}).get("Label", "MEDIUM")
            title = finding.get("Title")
            description = finding.get("Description")
            compliance_status = finding.get("Compliance", {}).get("Status", "FAILED")
            
            # Extract resource info
            resources = finding.get("Resources", [])
            resource_type = resources[0].get("Type") if resources else "Unknown"
            resource_id = resources[0].get("Id") if resources else "Unknown"
            
            # Extract compliance framework
            related_requirements = finding.get("Compliance", {}).get("RelatedRequirements", [])
            compliance_framework = "Other"
            for req in related_requirements:
                if "CIS" in req:
                    compliance_framework = "CIS"
                    break
                elif "SOC" in req or "TSC" in req:
                    compliance_framework = "SOC2"
                    break
            
            # Resolve tenant ID from AwsAccountId
            aws_account_id = finding.get("AwsAccountId")
            tenant_id = "tenant-prod"  # Default fallback
            if aws_account_id:
                try:
                    tenants_table_name = os.environ.get("DYNAMODB_TENANTS", "securestack-tenants")
                    table_tenants = dynamodb.Table(tenants_table_name)
                    from boto3.dynamodb.conditions import Attr
                    res = table_tenants.scan(FilterExpression=Attr("accountId").eq(aws_account_id))
                    items = res.get("Items", [])
                    if isinstance(items, list) and items:
                        tenant_id = items[0].get("tenantId", "tenant-prod")
                except Exception as te:
                    logger.warning(f"Failed to lookup tenant for account {aws_account_id}: {te}")
            
            # Classify action
            action = classify_finding(finding)
            timestamp = datetime.utcnow().isoformat() + "Z"
            
            # Prepare DynamoDB item
            table = dynamodb.Table(DYNAMODB_TABLE)
            db_item = {
                "tenantId": tenant_id,
                "findingId": finding_id,
                "timestamp": timestamp,
                "severity": severity,
                "resourceType": resource_type,
                "resourceId": resource_id,
                "title": title,
                "description": description,
                "complianceFramework": compliance_framework,
                "status": "OPEN" if compliance_status != "PASSED" else "RESOLVED",
                "action": action,
                "rawFinding": json.dumps(finding)
            }
            
            table.put_item(Item=db_item)
            logger.info(f"Stored finding {finding_id} for tenant {tenant_id} in DynamoDB")
            
            # Inject tenantId into finding payload for downstream lambdas
            finding["tenantId"] = tenant_id
            
            # Execute action
            if action == "AUTO_REMEDIATE" and REMEDIATE_FUNCTION_ARN:
                logger.info(f"Routing to Auto-Remediation: {REMEDIATE_FUNCTION_ARN}")
                lambda_client.invoke(
                    FunctionName=REMEDIATE_FUNCTION_ARN,
                    InvocationType="Event", # Async invocation
                    Payload=json.dumps(finding)
                )
            elif action == "EXPLAIN_AND_ALERT" and EXPLAINER_FUNCTION_ARN:
                logger.info(f"Routing to Bedrock AI Explainer: {EXPLAINER_FUNCTION_ARN}")
                lambda_client.invoke(
                    FunctionName=EXPLAINER_FUNCTION_ARN,
                    InvocationType="Event", # Async invocation
                    Payload=json.dumps(finding)
                )
            else:
                logger.info(f"Action log only or destination not configured. Action: {action}")
                
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Error processing finding: {str(e)}", exc_info=True)
            
    return {
        "statusCode": 200,
        "body": json.dumps(f"Successfully processed {processed_count} findings.")
    }
