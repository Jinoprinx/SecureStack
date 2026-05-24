# SecureStack — Compliance Mapping Directory

This document details the direct mappings between standard compliance frameworks (CIS AWS Foundations Benchmark v1.4.0 and SOC 2 Trust Services Criteria) and the automated AWS Config rules / Lambda remediations deployed within the SecureStack engine.

---

## 🛡️ CIS AWS Foundations Benchmark v1.4.0 Mapping

| Section | Control ID | Control Title / Description | Config Rule Identifier | Auto-Remediation Executed? |
|---|---|---|---|---|
| **1. IAM** | 1.4 | Ensure no 'root' user account access key exists | `iam-root-access-key-check` | ❌ (Alert & Explain Only) |
| | 1.5 | Ensure MFA is enabled for the 'root' user account | `root-account-mfa-enabled` | ❌ (Alert & Explain Only) |
| | 1.8 | Ensure IAM password policy requires length >= 14 | `iam-password-policy` | ❌ (Alert & Explain Only) |
| | 1.10 | Ensure MFA is enabled for all IAM users with console access | `iam-user-mfa-enabled` | ❌ (Alert & Explain Only) |
| **2. Storage** | 2.1.1 | Ensure S3 bucket server-side encryption is enabled | `s3-bucket-server-side-encryption-enabled` | ✅ (`AES256` SSE-S3 Key Put) |
| | 2.1.2 | Ensure S3 bucket public access is blocked | `s3-bucket-public-read-prohibited`<br>`s3-bucket-public-write-prohibited` | ✅ (Put S3 Public Access Block) |
| | 2.1.3 | Ensure S3 bucket versioning is enabled | `s3-bucket-versioning-enabled` | ✅ (Set versioning status to `Enabled`) |
| | 2.2.1 | Ensure EBS volume encryption is enabled in all regions | `encrypted-volumes`<br>`ec2-ebs-encryption-by-default` | ✅ (Set default regional encryption to `true`) |
| | 2.3.1 | Ensure RDS DB instances are not publicly accessible | `rds-instance-public-access-check` | ❌ (Alert & Explain Only) |
| **3. Logging** | 3.1 | Ensure CloudTrail is enabled in all regions | `cloudtrail-enabled`<br>`multi-region-cloud-trail-enabled` | ✅ (Start logging + Set multi-region) |
| **5. Network** | 5.1 | Ensure no security groups allow ingress on Port 22 from 0.0.0.0/0 | `restricted-ssh` | ✅ (Revoke public Port 22 ingress rule) |
| | 5.4 | Ensure default security group restricts all traffic | `vpc-default-security-group-closed` | ❌ (Alert & Explain Only) |

---

## 🔒 SOC 2 Trust Services Criteria (Common Criteria) Mapping

| Criteria | Objective | Related Config Rules | Managed Security Control | SecureStack Actions |
|---|---|---|---|---|
| **CC6.1** | Logical Access controls (Authentication, Authority) | `iam-user-mfa-enabled`<br>`root-account-mfa-enabled`<br>`iam-password-policy`<br>`iam-root-access-key-check` | Root MFA, User MFA, Password Strength, Root keys prohibited | Blocks credentials violation, generates Bedrock explainer, posts high-severity Slack notifications. |
| **CC6.3** | Access rights modification and authorization audits | `iam-root-access-key-check` | Root account credential limitations | Warns on creation of root API credentials. |
| **CC6.6** | Boundary protection (Firewalls, Network isolation) | `s3-bucket-public-read-prohibited`<br>`s3-bucket-public-write-prohibited`<br>`restricted-ssh`<br>`vpc-default-security-group-closed`<br>`rds-instance-public-access-check` | S3 Block Public Access, Ingress restriction, RDS isolated, VPC boundaries | Auto-removes public bucket settings, auto-closes wide-open SSH port 22 security rules. |
| **CC6.7** | Encryption of data during transmission (TLS/SSL) | `s3-bucket-server-side-encryption-enabled` | S3 encryption by default | Automatically enforces bucket-level default encryption. |
| **CC7.2** | Event detection and continuous monitoring | `cloudtrail-enabled`<br>`multi-region-cloud-trail-enabled`<br>`s3-bucket-versioning-enabled` | Audit logs enabled, data backups configured | Auto-starts CloudTrail auditing across all regions, enables bucket versioning backups. |
