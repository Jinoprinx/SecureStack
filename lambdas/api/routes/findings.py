import json
import boto3
from boto3.dynamodb.conditions import Key, Attr

def handle_findings(event, table_name, tenant_id):
    query_params = event.get("queryStringParameters") or {}
    severity = query_params.get("severity")
    status = query_params.get("status")
    resource_type = query_params.get("resourceType")
    limit = int(query_params.get("limit", 50))
    exclusive_start_key = None
    
    if query_params.get("lastKey"):
        try:
            exclusive_start_key = json.loads(query_params.get("lastKey"))
        except Exception:
            pass
            
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)
    
    query_kwargs = {
        "KeyConditionExpression": Key("tenantId").eq(tenant_id),
        "Limit": limit
    }
    if exclusive_start_key:
        query_kwargs["ExclusiveStartKey"] = exclusive_start_key
        
    filters = []
    if severity:
        filters.append(Attr("severity").eq(severity))
    if status:
        filters.append(Attr("status").eq(status))
    if resource_type:
        filters.append(Attr("resourceType").eq(resource_type))
        
    if filters:
        filter_expression = filters[0]
        for f in filters[1:]:
            filter_expression = filter_expression & f
        query_kwargs["FilterExpression"] = filter_expression
        
    response = table.query(**query_kwargs)
    items = response.get("Items", [])
    
    # Standardize output items (parse rawFinding string back to json for client convenience)
    for item in items:
        if "rawFinding" in item and isinstance(item["rawFinding"], str):
            try:
                item["rawFinding"] = json.loads(item["rawFinding"])
            except Exception:
                pass
                
    result = {
        "items": items,
        "lastKey": json.dumps(response.get("LastEvaluatedKey")) if response.get("LastEvaluatedKey") else None,
        "totalCount": len(items)
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
