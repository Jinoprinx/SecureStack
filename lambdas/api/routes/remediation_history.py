import json
import boto3
from boto3.dynamodb.conditions import Key, Attr

def handle_remediation_history(event, table_name, tenant_id):
    query_params = event.get("queryStringParameters") or {}
    limit = int(query_params.get("limit", 50))
    exclusive_start_key = None
    
    if query_params.get("lastKey"):
        try:
            exclusive_start_key = json.loads(query_params.get("lastKey"))
        except Exception:
            pass
            
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    
    # Query all findings scoped strictly to tenantId
    query_kwargs = {
        "KeyConditionExpression": Key("tenantId").eq(tenant_id)
    }
    
    response = table.query(**query_kwargs)
    items = response.get("Items", [])
    
    # Filter in Python to avoid DynamoDB FilterExpression limits on primary keys
    filtered_items = [
        item for item in items 
        if item.get("status") == "REMEDIATED" or item.get("findingId", "").startswith("remediation-")
    ]
    
    # Sort items by timestamp descending
    filtered_items.sort(key=lambda x: x.get("remediatedAt", x.get("timestamp", "")), reverse=True)
    
    result = {
        "items": filtered_items[:limit],
        "lastKey": None
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
