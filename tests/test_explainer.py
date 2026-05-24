import sys
import os
# Isolate sys.path to load correct handler
explainer_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/explainer"))
sys.path = [explainer_path] + [p for p in sys.path if "lambdas" not in p]
sys.modules.pop("handler", None)
import json
from unittest.mock import patch, MagicMock
import pytest

from handler import lambda_handler
import handler

@patch.object(handler, "dynamodb")
@patch.object(handler, "bedrock")
@patch.object(handler, "sns")
def test_explainer_bedrock_success(mock_sns, mock_bedrock, mock_db, sample_ssh_finding):
    # Mock DynamoDB table
    mock_table = MagicMock()
    mock_db.Table.return_value = mock_table
    
    # Mock Bedrock response
    mock_response = {
        "output": {
            "message": {
                "content": [
                    {
                        "text": json.dumps({
                            "what_happened": "SSH port 22 is open to the public on security group sg-0123456789abcdef0.",
                            "why_risky": "Unrestricted SSH access allows attackers to brute-force authentication and potentially gain control of EC2 instances.",
                            "how_to_fix": "1. Navigate to EC2 security groups.\n2. Locate sg-0123456789abcdef0.\n3. Revoke ingress rule for port 22 with source 0.0.0.0/0.",
                            "severity_justification": "Critically high risk because it exposes remote administration interfaces directly to the internet."
                        })
                    }
                ]
            }
        }
    }
    mock_bedrock.converse.return_value = mock_response
    
    # Run handler
    response = lambda_handler(sample_ssh_finding, None)
    
    # Assertions
    assert response["statusCode"] == 200
    
    # Verify Bedrock converse was called with right model
    mock_bedrock.converse.assert_called_once()
    args, kwargs = mock_bedrock.converse.call_args
    assert kwargs["modelId"] == "anthropic.claude-3-5-sonnet-20240620-v1:0"
    
    # Verify DynamoDB update was called to save the AI explanation
    mock_table.update_item.assert_called_once()
    
    # Verify SNS publish was called to send alert
    mock_sns.publish.assert_called_once()

@patch.object(handler, "dynamodb")
@patch.object(handler, "bedrock")
@patch.object(handler, "sns")
def test_explainer_fallback_on_bedrock_error(mock_sns, mock_bedrock, mock_db, sample_ssh_finding):
    mock_table = MagicMock()
    mock_db.Table.return_value = mock_table
    
    # Simulate Bedrock failure (e.g. rate limit, access error, etc.)
    mock_bedrock.converse.side_effect = Exception("Model access denied")
    
    # Run handler
    response = lambda_handler(sample_ssh_finding, None)
    
    # Explainer should catch error, use mock fallback, save to DB, and return 200
    assert response["statusCode"] == 200
    res_data = json.loads(response["body"])
    assert "explanation" in res_data
    assert "what_happened" in res_data["explanation"]
    
    # Verify DB write and SNS publish still ran with fallback text
    mock_table.update_item.assert_called_once()
    mock_sns.publish.assert_called_once()
stream = False
