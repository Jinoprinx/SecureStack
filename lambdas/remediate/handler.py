import json
import os
import logging
import boto3
from datetime import datetime
from remediations import get_remediations

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
securityhub = boto3.client("securityhub")
sns = boto3.client("sns")

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "securestack-findings")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

def get_tenant_session(tenant_id):
    """Retrieve IAM Role connection parameters for assumed sessions and return session client."""
    try:
        tenants_table_name = os.environ.get("DYNAMODB_TENANTS", "securestack-tenants")
        table = dynamodb.Table(tenants_table_name)
        from boto3.dynamodb.conditions import Key
        res = table.query(KeyConditionExpression=Key("tenantId").eq(tenant_id))
        items = res.get("Items", [])
        if items:
            role_arn = items[0].get("roleArn")
            external_id = items[0].get("externalId")
            if role_arn:
                logger.info(f"Assuming role {role_arn} for tenant {tenant_id}")
                sts = boto3.client("sts")
                assume_kwargs = {
                    "RoleArn": role_arn,
                    "RoleSessionName": "SecureStackRemediationSession"
                }
                if external_id:
                    assume_kwargs["ExternalId"] = external_id
                    
                assumed = sts.assume_role(**assume_kwargs)
                creds = assumed["Credentials"]
                return boto3.Session(
                    aws_access_key_id=creds["AccessKeyId"],
                    aws_secret_access_key=creds["SecretAccessKey"],
                    aws_session_token=creds["SessionToken"]
                )
    except Exception as e:
        logger.warning(f"Could not load tenant connection details for {tenant_id}: {e}. Falling back to default session.")
    return None

def lambda_handler(event, context):
    logger.info(f"Remediation Lambda invoked with finding: {json.dumps(event)}")
    
    finding = event
    finding_id = finding.get("Id")
    generator_id = finding.get("GeneratorId", "")
    product_arn = finding.get("ProductArn", "")
    tenant_id = finding.get("tenantId", "tenant-prod")
    
    if not finding_id:
        logger.error("No finding ID present in the event.")
        return {"statusCode": 400, "body": "Missing finding ID."}
        
    remediations = get_remediations()
    target_module = None
    
    # 1. Find a module that can remediate this finding
    for module in remediations:
        if module.can_remediate(finding):
            target_module = module
            break
            
    if not target_module:
        msg = f"No auto-remediation module found for generator: {generator_id}"
        logger.warning(msg)
        return {"statusCode": 404, "body": msg}
        
    logger.info(f"Found remediation module: {target_module.__name__}")
    
    try:
        # 2. Get assumed role session
        session = get_tenant_session(tenant_id)
        
        # 3. Execute remediation
        result = target_module.remediate(finding, session=session)
        logger.info(f"Remediation result: {result}")
        
        # 4. Update finding status in DynamoDB to REMEDIATED (SaaS account)
        table = dynamodb.Table(DYNAMODB_TABLE)
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        try:
            table.update_item(
                Key={"tenantId": tenant_id, "findingId": finding_id},
                UpdateExpression="SET #status = :s, remediationAction = :a, beforeState = :b, afterState = :a_state, remediatedAt = :r_time",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":s": "REMEDIATED",
                    ":a": result.action_taken,
                    ":b": result.before_state,
                    ":a_state": result.after_state,
                    ":r_time": timestamp
                }
            )
            logger.info("Updated DynamoDB finding status to REMEDIATED")
        except Exception as db_err:
            logger.warning(f"Could not update original finding. Creating remediation entry: {db_err}")
            table.put_item(
                Item={
                    "tenantId": tenant_id,
                    "findingId": f"remediation-{finding_id}",
                    "timestamp": timestamp,
                    "status": "REMEDIATED",
                    "resourceId": result.resource_id,
                    "actionTaken": result.action_taken,
                    "beforeState": result.before_state,
                    "afterState": result.after_state,
                    "success": result.success,
                    "autoRemediated": True
                }
            )
            
        # 5. Update Security Hub finding status to RESOLVED (Tenant account)
        if product_arn:
            try:
                sh_client = session.client("securityhub") if session else securityhub
                sh_client.batch_update_findings(
                    FindingIdentifiers=[
                        {
                            "Id": finding_id,
                            "ProductArn": product_arn
                        }
                    ],
                    Workflow={"Status": "RESOLVED"},
                    Note={
                        "Text": f"Auto-remediated successfully via SecureStack: {result.action_taken}",
                        "UpdatedBy": "SecureStack-Remediation-Lambda"
                    }
                )
                logger.info("Updated Security Hub finding workflow status to RESOLVED")
            except Exception as sh_err:
                logger.error(f"Failed to update Security Hub: {str(sh_err)}")
                
        # 5. Notify via SNS
        if SNS_TOPIC_ARN:
            sns_msg = {
                "Alert": "AUTO_REMEDIATION_SUCCESS",
                "FindingId": finding_id,
                "Resource": result.resource_id,
                "Action": result.action_taken,
                "Time": timestamp
            }
            try:
                sns.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Subject=f"RESOLVED: Auto-remediated {finding.get('Title')}",
                    Message=json.dumps(sns_msg, indent=2)
                )
            except Exception as sns_err:
                logger.error(f"Failed to publish to SNS: {str(sns_err)}")
                
        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "resourceId": result.resource_id,
                "action": result.action_taken
            })
        }
        
    except Exception as e:
        logger.error(f"Remediation failed: {str(e)}", exc_info=True)
        # Log failure in DynamoDB
        # Notify failure via SNS
        if SNS_TOPIC_ARN:
            try:
                sns.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Subject=f"FAILED: Auto-remediation for {finding.get('Title')}",
                    Message=f"Remediation failed for finding {finding_id}.\nError: {str(e)}"
                )
            except Exception as sns_err:
                logger.error(f"Failed to publish failure alert: {str(sns_err)}")
                
        raise e
