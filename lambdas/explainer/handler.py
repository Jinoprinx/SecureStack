import json
import os
import logging
import boto3
from datetime import datetime
from botocore.exceptions import ClientError
from prompt_templates import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))
sns = boto3.client("sns")

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "securestack-findings")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")

def get_mock_explanation(title, severity, resource_id):
    """
    Fallback explanation if Bedrock is not available/configured in this AWS account.
    """
    logger.info("Using mock explanation fallback")
    return {
        "what_happened": f"A security check for '{title}' failed on resource '{resource_id}'. This resource is currently in violation of security compliance rules.",
        "why_risky": f"Missing security configurations for this type of resource can lead to data exposure, unauthorized access, or regulatory non-compliance during audits.",
        "how_to_fix": "1. Log in to the AWS Management Console.\n2. Navigate to the service page for this resource.\n3. Verify current configurations and adjust them to match security guidelines.\n4. Save changes and re-run compliance checks.",
        "severity_justification": f"This finding is marked as {severity} because it impacts compliance posture and should be resolved according to internal SLAs."
    }

def lambda_handler(event, context):
    logger.info(f"Explainer Lambda invoked with finding: {json.dumps(event)}")
    
    finding = event
    finding_id = finding.get("Id")
    title = finding.get("Title")
    description = finding.get("Description")
    severity = finding.get("Severity", {}).get("Label", "MEDIUM")
    tenant_id = finding.get("tenantId", "tenant-prod")
    
    resources = finding.get("Resources", [])
    resource_type = resources[0].get("Type") if resources else "Unknown"
    resource_id = resources[0].get("Id") if resources else "Unknown"
    
    generator_id = finding.get("GeneratorId", "")
    compliance = finding.get("Compliance", {})
    compliance_details = json.dumps(compliance.get("RelatedRequirements", []))
    
    if not finding_id:
        return {"statusCode": 400, "body": "Missing finding ID."}
        
    # Build user prompt
    user_prompt = USER_PROMPT_TEMPLATE.format(
        title=title,
        description=description,
        severity=severity,
        resource_type=resource_type,
        resource_id=resource_id,
        generator_id=generator_id,
        compliance_details=compliance_details,
        raw_finding=json.dumps(finding, indent=2)
    )
    
    explanation = None
    
    # Try calling Bedrock
    try:
        logger.info(f"Invoking Bedrock model: {BEDROCK_MODEL_ID}")
        response = bedrock.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": user_prompt}]
                }
            ],
            system=[{"text": SYSTEM_PROMPT}],
            inferenceConfig={
                "maxTokens": 1024,
                "temperature": 0.2
            }
        )
        
        response_text = response["output"]["message"]["content"][0]["text"]
        logger.info(f"Raw Bedrock response: {response_text}")
        
        # Parse JSON response
        # Claude might sometimes wrap json in markdown tags ```json ... ```
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
            
        explanation = json.loads(response_text)
        
    except ClientError as e:
        logger.warning(f"AWS Bedrock ClientError (could be lack of model access): {str(e)}")
        explanation = get_mock_explanation(title, severity, resource_id)
    except Exception as e:
        logger.error(f"Unexpected error calling Bedrock: {str(e)}", exc_info=True)
        explanation = get_mock_explanation(title, severity, resource_id)
        
    # Update DynamoDB finding with the explanation details
    table = dynamodb.Table(DYNAMODB_TABLE)
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Structure explanation details for DynamoDB
    ai_explanation_db = {
        "whatHappened": explanation.get("what_happened"),
        "whyRisky": explanation.get("why_risky"),
        "howToFix": explanation.get("how_to_fix"),
        "severityJustification": explanation.get("severity_justification"),
        "generatedAt": timestamp
    }
    
    try:
        table.update_item(
            Key={"tenantId": tenant_id, "findingId": finding_id},
            UpdateExpression="SET aiExplanation = :e",
            ExpressionAttributeValues={":e": ai_explanation_db}
        )
        logger.info("Successfully updated DynamoDB finding with AI explanation.")
    except Exception as db_err:
        logger.error(f"DynamoDB Update Error: {str(db_err)}")
        
    # Send SNS alert (which could be mapped to Slack webhook or Email)
    if SNS_TOPIC_ARN:
        sns_subject = f"🚨 SECURESTACK ALERT: {severity} Finding on {resource_type}"
        sns_body = (
            f"Title: {title}\n"
            f"Resource: {resource_id}\n"
            f"Severity: {severity}\n\n"
            f"--- AI EXPLANATION ---\n"
            f"WHAT HAPPENED:\n{explanation.get('what_happened')}\n\n"
            f"WHY IT'S RISKY:\n{explanation.get('why_risky')}\n\n"
            f"HOW TO FIX:\n{explanation.get('how_to_fix')}\n\n"
            f"----------------------\n"
            f"View in SecureStack Dashboard: {os.environ.get('DASHBOARD_URL', 'http://localhost:3000')}"
        )
        try:
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=sns_subject,
                Message=sns_body
            )
            logger.info("Published alert to SNS Topic.")
        except Exception as sns_err:
            logger.error(f"SNS Publish Error: {str(sns_err)}")
            
    return {
        "statusCode": 200,
        "body": json.dumps({
            "success": True,
            "explanation": explanation
        })
    }
