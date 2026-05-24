import sys
import os
# Isolate sys.path to load correct handler
triage_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/triage"))
sys.path = [triage_path] + [p for p in sys.path if "lambdas" not in p]
sys.modules.pop("handler", None)
import json
from unittest.mock import patch, MagicMock
import pytest

from handler import lambda_handler
from severity_classifier import classify_finding
import handler

def test_severity_classification(sample_s3_finding, sample_ssh_finding):
    # S3 finding should be AUTO_REMEDIATE
    action_s3 = classify_finding(sample_s3_finding)
    assert action_s3 == "AUTO_REMEDIATE"
    
    # SSH finding should be EXPLAIN_AND_ALERT
    action_ssh = classify_finding(sample_ssh_finding)
    assert action_ssh == "EXPLAIN_AND_ALERT"

@patch.object(handler, "dynamodb")
@patch.object(handler, "lambda_client")
@patch.object(handler, "sns")
def test_handler_routing_remediate(mock_sns, mock_lambda, mock_db, sample_s3_finding):
    # Mock DynamoDB Table behavior
    mock_table = MagicMock()
    mock_db.Table.return_value = mock_table
    
    # Prepare input event
    event = {
        "detail": {
            "findings": [sample_s3_finding]
        }
    }
    
    # Run handler
    response = lambda_handler(event, None)
    
    # Assert status code
    assert response["statusCode"] == 200
    
    # Assert DynamoDB storage was called
    mock_table.put_item.assert_called_once()
    
    # Assert lambda invoke was called for remediation (since S3 public access is mapped to AUTO_REMEDIATE)
    mock_lambda.invoke.assert_called_once()
    args, kwargs = mock_lambda.invoke.call_args
    assert kwargs["FunctionName"] == "arn:aws:lambda:us-east-1:123456789012:function:remediate"
    assert kwargs["InvocationType"] == "Event"

@patch.object(handler, "dynamodb")
@patch.object(handler, "lambda_client")
@patch.object(handler, "sns")
def test_handler_routing_explain(mock_sns, mock_lambda, mock_db, sample_ssh_finding):
    # Mock DynamoDB Table behavior
    mock_table = MagicMock()
    mock_db.Table.return_value = mock_table
    
    # Prepare input event
    event = {
        "detail": {
            "findings": [sample_ssh_finding]
        }
    }
    
    # Run handler
    response = lambda_handler(event, None)
    
    # Assert status code
    assert response["statusCode"] == 200
    
    # Assert DynamoDB storage was called
    mock_table.put_item.assert_called_once()
    
    # Assert lambda invoke was called for Bedrock explainer (since SSH is EXPLAIN_AND_ALERT)
    mock_lambda.invoke.assert_called_once()
    args, kwargs = mock_lambda.invoke.call_args
    assert kwargs["FunctionName"] == "arn:aws:lambda:us-east-1:123456789012:function:explainer"
