import sys
import os
# Isolate sys.path to load correct remediations
remediate_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/remediate"))
sys.path = [remediate_path] + [p for p in sys.path if "lambdas" not in p]
sys.modules.pop("handler", None)
from unittest.mock import patch, MagicMock
import pytest

from remediations.s3_public_access import can_remediate as can_rem_s3, remediate as rem_s3
from remediations.sg_open_access import can_remediate as can_rem_sg, remediate as rem_sg

def test_s3_public_access_detection(sample_s3_finding, sample_ssh_finding):
    assert can_rem_s3(sample_s3_finding) is True
    assert can_rem_s3(sample_ssh_finding) is False

@patch("remediations.s3_public_access.boto3.client")
def test_s3_public_access_remediate(mock_s3_client, sample_s3_finding):
    # Setup mock S3 client
    s3_mock = MagicMock()
    mock_s3_client.return_value = s3_mock
    
    # Configure mock responses
    s3_mock.get_public_access_block.return_value = {
        "PublicAccessBlockConfiguration": {
            "BlockPublicAcls": False,
            "IgnorePublicAcls": False
        }
    }
    
    # Run remediation
    result = rem_s3(sample_s3_finding)
    
    # Assertions
    assert result.success is True
    assert result.resource_id == "my-public-bucket"
    assert result.action_taken == "s3.put_public_access_block"
    
    # Verify calls
    s3_mock.put_public_access_block.assert_called_once_with(
        Bucket="my-public-bucket",
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True
        }
    )

def test_sg_open_access_detection(sample_s3_finding, sample_ssh_finding):
    assert can_rem_sg(sample_ssh_finding) is True
    assert can_rem_sg(sample_s3_finding) is False

@patch("remediations.sg_open_access.boto3.client")
def test_sg_open_access_remediate(mock_ec2_client, sample_ssh_finding):
    ec2_mock = MagicMock()
    mock_ec2_client.return_value = ec2_mock
    
    # Configure mock describe security groups response
    ec2_mock.describe_security_groups.return_value = {
        "SecurityGroups": [
            {
                "GroupId": "sg-0123456789abcdef0",
                "IpPermissions": [
                    {
                        "IpProtocol": "tcp",
                        "FromPort": 22,
                        "ToPort": 22,
                        "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
                    }
                ]
            }
        ]
    }
    
    # Run remediation
    result = rem_sg(sample_ssh_finding)
    
    # Assertions
    assert result.success is True
    assert result.resource_id == "sg-0123456789abcdef0"
    assert result.action_taken == "ec2.revoke_security_group_ingress"
    
    # Verify revoke was called
    ec2_mock.revoke_security_group_ingress.assert_called_once()
