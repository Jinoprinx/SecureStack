# ---------------------------------------------------------------------------
# Remote State — S3 + DynamoDB for state locking
# The S3 bucket and DynamoDB table must be created BEFORE running terraform init.
# Use a bootstrap script or create them manually first.
# ---------------------------------------------------------------------------

terraform {
  backend "s3" {
    bucket         = "securestack-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "securestack-terraform-locks"
  }
}
