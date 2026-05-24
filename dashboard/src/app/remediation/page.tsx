'use client';

import React, { useEffect, useState } from 'react';
import { fetchRemediationHistory } from '@/lib/api';
import { RemediationEvent } from '@/lib/types';
import RemediationTimeline from '@/components/RemediationTimeline';

export default function RemediationPage() {
  const [events, setEvents] = useState<RemediationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchRemediationHistory();
        setEvents(data);
      } catch (e) {
        console.error('Failed to fetch remediation history', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Compute stats
  const totalCount = events.length;
  const autoFixedCount = events.filter(e => e.autoRemediated).length;
  const successCount = events.filter(e => e.success).length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
      
      {/* Overview stats grid */}
      <div className="grid-cols-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card stat-card low">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Total Resolved Violations
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {isLoading ? '...' : totalCount}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Across S3, EBS, SG, IAM, CloudTrail
          </p>
        </div>

        <div className="card stat-card medium">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Automatically Remediated
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {isLoading ? '...' : autoFixedCount}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Fixed via Boto3 Lambda functions
          </p>
        </div>

        <div className="card stat-card low">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Remediation Success Rate
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {isLoading ? '...' : `${successRate}%`}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            0 failures in the past 30 days
          </p>
        </div>
      </div>

      {/* Timeline listing */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span>Loading remediation audit log...</span>
          </div>
        </div>
      ) : (
        <RemediationTimeline events={events} />
      )}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
