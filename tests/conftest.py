import os
import sys
import pytest

# Add lambdas directories to system path for import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/triage")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/remediate")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/explainer")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../lambdas/api")))

# Set mock environment variables for test execution
os.environ["DYNAMODB_TABLE"] = "securestack-findings-test"
os.environ["SNS_TOPIC_ARN"] = "arn:aws:sns:us-east-1:123456789012:test-topic"
os.environ["REMEDIATE_FUNCTION_ARN"] = "arn:aws:lambda:us-east-1:123456789012:function:remediate"
os.environ["EXPLAINER_FUNCTION_ARN"] = "arn:aws:lambda:us-east-1:123456789012:function:explainer"
os.environ["BEDROCK_MODEL_ID"] = "anthropic.claude-3-5-sonnet-20240620-v1:0"

@pytest.fixture
def sample_s3_finding():
    return {
        "Id": "arn:aws:securityhub:us-east-1:123456789012:subscription/s3-bucket-public-read-prohibited/finding/123",
        "ProductArn": "arn:aws:securityhub:us-east-1::product/aws/config",
        "GeneratorId": "aws-config-rule/s3-bucket-public-read-prohibited",
        "AwsAccountId": "123456789012",
        "Title": "S3 Buckets should prohibit public read access",
        "Description": "This check passes if S3 buckets prohibit public read access.",
        "Severity": {"Label": "HIGH"},
        "Resources": [
            {
                "Type": "AwsS3Bucket",
                "Id": "arn:aws:s3:::my-public-bucket",
                "Region": "us-east-1"
            }
        ],
        "Compliance": {
            "Status": "FAILED",
            "RelatedRequirements": ["CIS AWS Foundations Benchmark v1.4.0/2.1.2"]
        },
        "CreatedAt": "2026-05-23T10:00:00Z"
    }

@pytest.fixture
def sample_ssh_finding():
    return {
        "Id": "arn:aws:securityhub:us-east-1:123456789012:subscription/restricted-ssh/finding/456",
        "ProductArn": "arn:aws:securityhub:us-east-1::product/aws/config",
        "GeneratorId": "aws-config-rule/restricted-ssh",
        "AwsAccountId": "123456789012",
        "Title": "SSH port 22 should not be open to the public",
        "Description": "Checks whether security groups allow unrestricted SSH access.",
        "Severity": {"Label": "CRITICAL"},
        "Resources": [
            {
                "Type": "AwsEc2SecurityGroup",
                "Id": "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0123456789abcdef0",
                "Region": "us-east-1"
            }
        ],
        "Compliance": {
            "Status": "FAILED",
            "RelatedRequirements": ["CIS AWS Foundations Benchmark v1.4.0/5.1"]
        },
        "CreatedAt": "2026-05-23T10:00:00Z"
    }
