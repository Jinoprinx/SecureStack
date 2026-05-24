'use client';

import React, { useState, useEffect } from 'react';
import { connectTenant } from '@/lib/api';

export default function ConnectPage() {
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [externalId, setExternalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate a random External ID on mount
    const randId = 'ss-ext-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setExternalId(randId);
  }, []);

  const handleCopy = () => {
    const policy = JSON.stringify(trustPolicy, null, 2);
    navigator.clipboard.writeText(policy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trustPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          AWS: "arn:aws:iam::112233445566:root" // Representing the central SaaS Account ID
        },
        Action: "sts:AssumeRole",
        Condition: {
          StringEquals: {
            "sts:ExternalId": externalId
          }
        }
      }
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !accountId || !roleArn) return;
    
    setIsSubmitting(true);
    try {
      const generatedTenantId = 'tenant-custom-' + accountId;
      await connectTenant({
        tenantId: generatedTenantId,
        accountId,
        accountName,
        roleArn,
        externalId
      });
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Side: Setup Form */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
            Connect a New AWS Account
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Account Name / Label
              </label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="e.g. AWS Production Workload"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                AWS Account ID (12-digit)
              </label>
              <input
                type="text"
                maxLength={12}
                value={accountId}
                onChange={e => setAccountId(e.target.value.replace(/\D/g, ''))}
                placeholder="123456789012"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                IAM Auditor Role ARN
              </label>
              <input
                type="text"
                value={roleArn}
                onChange={e => setRoleArn(e.target.value)}
                placeholder="arn:aws:iam::ACCOUNT_ID:role/SecureStackAuditor"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Required External ID (Generated)
              </label>
              <input
                type="text"
                value={externalId}
                readOnly
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: 'var(--accent-amber)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || success}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--accent-blue) 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                marginTop: '12px'
              }}
            >
              {success ? 'Account Connected Successfully!' : isSubmitting ? 'Establishing Trust Connection...' : 'Connect AWS Account'}
            </button>
          </form>
        </div>

        {/* Right Side: Deployment Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              🛠️ Setup Instructions
            </h3>
            <ol style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>
                Log into your target AWS Account and navigate to **IAM Roles**.
              </li>
              <li>
                Create a new Role choosing **Custom Trust Policy** as the trust entity type.
              </li>
              <li>
                Copy and paste the JSON Trust Document shown below, which authorizes our central SecureStack auditing platform.
              </li>
              <li>
                Attach a security policy with read-only capabilities (e.g. `SecurityAudit` managed policy) and write permissions restricted to remediation actions (S3, EC2, CloudTrail logs, Security Hub).
              </li>
              <li>
                Name the role `SecureStackAuditor`, complete the form on the left, and click **Connect**.
              </li>
            </ol>
          </div>

          <div className="card" style={{ padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                TRUST POLICY DOCUMENT (JSON)
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre style={{
              background: '#04060b',
              padding: '16px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#d4d4d4',
              overflowX: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.03)',
              fontFamily: 'monospace'
            }}>
              {JSON.stringify(trustPolicy, null, 2)}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
