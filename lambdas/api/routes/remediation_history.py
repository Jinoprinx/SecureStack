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
    
    # Query findings scoped strictly to tenantId
    query_kwargs = {
        "KeyConditionExpression": Key("tenantId").eq(tenant_id),
        "Limit": limit,
        "FilterExpression": Attr("status").eq("REMEDIATED") | Attr("findingId").begins_with("remediation-")
    }
    if exclusive_start_key:
        query_kwargs["ExclusiveStartKey"] = exclusive_start_key
        
    response = table.query(**query_kwargs)
    items = response.get("Items", [])
    
    # Sort items by timestamp descending
    items.sort(key=lambda x: x.get("remediatedAt", x.get("timestamp", "")), reverse=True)
    
    result = {
        "items": items,
        "lastKey": json.dumps(response.get("LastEvaluatedKey")) if response.get("LastEvaluatedKey") else None
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
