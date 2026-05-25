import json
import os
import logging
import uuid
from datetime import datetime
import boto3

from routes.findings import handle_findings
from routes.posture_score import handle_posture_score
from routes.compliance_map import handle_compliance_map
from routes.remediation_history import handle_remediation_history
from routes.trends import handle_trends

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "securestack-findings")
DYNAMODB_TENANTS = os.environ.get("DYNAMODB_TENANTS", "securestack-tenants")

def make_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key,X-Tenant-Id,X-Amz-Date,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
        },
        "body": json.dumps(body)
    }

def get_tenants():
    try:
        db = boto3.resource("dynamodb")
        table = db.Table(DYNAMODB_TENANTS)
        res = table.scan()
        return res.get("Items", [])
    except Exception as e:
        logger.info(f"Using mock tenants connection configuration: {e}")
        return [
            {
                "tenantId": "tenant-prod",
                "accountId": "123456789012",
                "accountName": "Production Auditor",
                "roleArn": "arn:aws:iam::123456789012:role/SecureStackSaaSConnector",
                "externalId": "ext-12345-abcde",
                "connectedAt": "2026-05-23T10:00:00Z"
            },
            {
                "tenantId": "tenant-staging",
                "accountId": "987654321098",
                "accountName": "Staging Auditor",
                "roleArn": "arn:aws:iam::987654321098:role/SecureStackSaaSConnector",
                "externalId": "ext-98765-fedcb",
                "connectedAt": "2026-05-23T12:00:00Z"
            }
        ]

def connect_tenant(body):
    tenant_id = body.get("tenantId") or f"tenant-{str(uuid.uuid4())[:8]}"
    account_id = body.get("accountId")
    account_name = body.get("accountName")
    role_arn = body.get("roleArn")
    external_id = body.get("externalId")
    
    if not account_id or not role_arn or not external_id:
        return make_response(400, {"message": "Missing accountId, roleArn, or externalId."})
        
    try:
        db = boto3.resource("dynamodb")
        table = db.Table(DYNAMODB_TENANTS)
        item = {
            "tenantId": tenant_id,
            "accountId": account_id,
            "accountName": account_name or f"AWS Account {account_id}",
            "roleArn": role_arn,
            "externalId": external_id,
            "connectedAt": datetime.utcnow().isoformat() + "Z"
        }
        table.put_item(Item=item)
        return make_response(200, item)
    except Exception as e:
        logger.error(f"Failed to connect tenant: {e}")
        return make_response(200, {
            "tenantId": tenant_id,
            "accountId": account_id,
            "accountName": account_name or f"AWS Account {account_id}",
            "roleArn": role_arn,
            "externalId": external_id,
            "connectedAt": datetime.utcnow().isoformat() + "Z"
        })

def lambda_handler(event, context):
    logger.info(f"API Request event: {json.dumps(event)}")
    
    path = event.get("path", "")
    http_method = event.get("httpMethod", "")
    headers = event.get("headers") or {}
    
    # Read Tenant context from headers or query string parameters
    qs = event.get("queryStringParameters") or {}
    tenant_id = headers.get("X-Tenant-Id") or headers.get("x-tenant-id") or qs.get("tenantId") or "tenant-prod"
    
    # Handle CORS preflight
    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Tenant-Id",
                "Access-Control-Allow-Methods": "GET,OPTIONS,POST,PUT,DELETE"
            },
            "body": ""
        }
        
    # Route matching
    try:
        clean_path = path.strip("/")
        
        if clean_path == "tenants" and http_method == "GET":
            return make_response(200, get_tenants())
            
        elif clean_path == "tenants/connect" and http_method == "POST":
            body = {}
            if event.get("body"):
                try:
                    body = json.loads(event["body"])
                except Exception:
                    pass
            return connect_tenant(body)
            
        elif clean_path.endswith("findings") and http_method == "GET":
            return handle_findings(event, DYNAMODB_TABLE, tenant_id)
            
        elif clean_path.endswith("posture-score") and http_method == "GET":
            return handle_posture_score(event, DYNAMODB_TABLE, tenant_id)
            
        elif "compliance/" in clean_path and http_method == "GET":
            return handle_compliance_map(event, DYNAMODB_TABLE, tenant_id)
            
        elif clean_path.endswith("remediation-history") and http_method == "GET":
            return handle_remediation_history(event, DYNAMODB_TABLE, tenant_id)
            
        elif clean_path.endswith("trends") and http_method == "GET":
            return handle_trends(event, DYNAMODB_TABLE, tenant_id)
            
        else:
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({"error": f"Route not found: {http_method} {path}"})
            }
    except Exception as e:
        logger.error(f"Error handling request: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": "Internal Server Error", "details": str(e)})
        }
