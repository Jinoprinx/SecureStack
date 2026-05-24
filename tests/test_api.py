import sys
import os
# Isolate sys.path to load correct handler
api_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/api"))
sys.path = [api_path] + [p for p in sys.path if "lambdas" not in p]
sys.modules.pop("handler", None)
import json
from unittest.mock import patch, MagicMock
import pytest

from handler import lambda_handler

@patch("routes.findings.boto3.resource")
def test_api_findings_endpoint(mock_db):
    # Mock DynamoDB query response
    mock_table = MagicMock()
    mock_db.return_value.Table.return_value = mock_table
    mock_table.query.return_value = {
        "Items": [
            {
                "findingId": "finding-1",
                "severity": "HIGH",
                "status": "OPEN",
                "resourceType": "AwsS3Bucket",
                "rawFinding": "{}"
            }
        ]
    }
    
    # Event matching path/method
    event = {
        "path": "/findings",
        "httpMethod": "GET",
        "queryStringParameters": {"severity": "HIGH"},
        "headers": {"X-Tenant-Id": "tenant-prod"}
    }
    
    response = lambda_handler(event, None)
    
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "items" in body
    assert len(body["items"]) == 1
    assert body["items"][0]["findingId"] == "finding-1"

@patch("routes.posture_score.boto3.resource")
def test_api_posture_score(mock_db):
    mock_table = MagicMock()
    mock_db.return_value.Table.return_value = mock_table
    mock_table.query.return_value = {
        "Items": [
            {"findingId": "1", "status": "OPEN", "severity": "HIGH", "resourceType": "AwsS3Bucket"},
            {"findingId": "2", "status": "REMEDIATED", "severity": "MEDIUM", "resourceType": "AwsS3Bucket"},
            {"findingId": "3", "status": "REMEDIATED", "severity": "LOW", "resourceType": "AwsEc2Instance"}
        ]
    }
    
    event = {
        "path": "/posture-score",
        "httpMethod": "GET",
        "headers": {"X-Tenant-Id": "tenant-prod"}
    }
    
    response = lambda_handler(event, None)
    
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    # 2 passing, 1 failing -> 66% score
    assert body["score"] == 66
    assert body["total"] == 3
    assert body["passing"] == 2
    assert body["failing"] == 1
    assert "S3" in body["byCategory"]

@patch("routes.compliance_map.boto3.resource")
def test_api_compliance_cis(mock_db):
    mock_table = MagicMock()
    mock_db.return_value.Table.return_value = mock_table
    # Mock some failing config rules (e.g. s3-bucket-public-read-prohibited)
    mock_table.query.return_value = {
        "Items": [
            {
                "findingId": "1",
                "status": "OPEN",
                "generatorId": "aws-config-rule/s3-bucket-public-read-prohibited",
                "resourceId": "bucket-a"
            }
        ]
    }
    
    event = {
        "path": "/compliance/cis",
        "httpMethod": "GET",
        "pathParameters": {"framework": "cis"},
        "headers": {"X-Tenant-Id": "tenant-prod"}
    }
    
    response = lambda_handler(event, None)
    
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["framework"] == "cis"
    
    # Verify control 2.1.2 (S3 Public Access Block) shows status = FAIL
    controls = body["controls"]
    s3_public_ctrl = next(c for c in controls if c["controlId"] == "2.1.2")
    assert s3_public_ctrl["status"] == "FAIL"
    assert "bucket-a" in s3_public_ctrl["resourcesAffected"]
