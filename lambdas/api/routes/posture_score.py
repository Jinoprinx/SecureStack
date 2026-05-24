import json
import boto3
from boto3.dynamodb.conditions import Key

def handle_posture_score(event, table_name, tenant_id):
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    
    # Query findings scoped strictly to tenantId
    response = table.query(
        KeyConditionExpression=Key("tenantId").eq(tenant_id),
        ProjectionExpression="findingId, #status, severity, resourceType",
        ExpressionAttributeNames={"#status": "status"}
    )
    items = response.get("Items", [])
    
    # Calculate counts
    total = len(items)
    failing = sum(1 for item in items if item.get("status") == "OPEN")
    passing = total - failing
    
    # If no findings exist, default to 100% compliance
    score = int((passing / total) * 100) if total > 0 else 100
    
    # Break down by category/service
    by_category = {}
    for item in items:
        res_type = item.get("resourceType", "Other")
        # Simplify type (e.g. AwsS3Bucket -> S3, AwsEc2Instance -> EC2)
        category = res_type.replace("Aws", "")
        if "S3" in category:
            category = "S3"
        elif "Ec2" in category or "SecurityGroup" in category or "Vpc" in category:
            category = "EC2/VPC"
        elif "Iam" in category:
            category = "IAM"
        elif "Rds" in category:
            category = "RDS"
        elif "CloudTrail" in category:
            category = "CloudTrail"
            
        if category not in by_category:
            by_category[category] = {"total": 0, "failing": 0, "passing": 0}
            
        by_category[category]["total"] += 1
        if item.get("status") == "OPEN":
            by_category[category]["failing"] += 1
        else:
            by_category[category]["passing"] += 1
            
    result = {
        "score": score,
        "total": total,
        "passing": passing,
        "failing": failing,
        "byCategory": by_category
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
