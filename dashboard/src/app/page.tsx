'use client';

import React, { useEffect, useState } from 'react';
import { fetchFindings, fetchPostureScore, fetchTrends, fetchRemediationHistory } from '@/lib/api';
import { Finding, PostureScoreData, TrendDataPoint, RemediationEvent } from '@/lib/types';
import StatCard from '@/components/StatCard';
import PostureScore from '@/components/PostureScore';
import TrendChart from '@/components/TrendChart';
import SeverityChart from '@/components/SeverityChart';
import SeverityBadge from '@/components/SeverityBadge';
import RemediationTimeline from '@/components/RemediationTimeline';
import Link from 'next/link';

export default function DashboardPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [posture, setPosture] = useState<PostureScoreData | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [remediations, setRemediations] = useState<RemediationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [findingsData, postureData, trendsData, remediationsData] = await Promise.all([
          fetchFindings(),
          fetchPostureScore(),
          fetchTrends(),
          fetchRemediationHistory(),
        ]);
        setFindings(findingsData);
        setPosture(postureData);
        setTrends(trendsData);
        setRemediations(remediationsData);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading || !posture) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Loading security posture...</span>
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Calculate stats
  const criticalCount = findings.filter(f => f.severity === 'CRITICAL' && f.status === 'ACTIVE').length;
  const highCount = findings.filter(f => f.severity === 'HIGH' && f.status === 'ACTIVE').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM' && f.status === 'ACTIVE').length;
  const lowCount = findings.filter(f => f.severity === 'LOW' && f.status === 'ACTIVE').length;

  // Filter top 5 active/critical findings for dashboard quick display
  const topFindings = findings
    .filter(f => f.status === 'ACTIVE')
    .sort((a, b) => {
      const weight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return (weight[b.severity] || 0) - (weight[a.severity] || 0);
    })
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
      
      {/* Stat Cards KPI Row */}
      <div className="grid-cols-4">
        <StatCard
          label="Critical Risks"
          value={criticalCount}
          trend={12}
          trendDirection="down"
          icon="🚨"
          severityClass="critical"
        />
        <StatCard
          label="High Risks"
          value={highCount}
          trend={8}
          trendDirection="down"
          icon="⚠️"
          severityClass="high"
        />
        <StatCard
          label="Medium Risks"
          value={mediumCount}
          trend={2}
          trendDirection="up"
          icon="🔵"
          severityClass="medium"
        />
        <StatCard
          label="Low Risks"
          value={lowCount}
          trend={15}
          trendDirection="down"
          icon="🟢"
          severityClass="low"
        />
      </div>

      {/* Row 2: Posture Radial + Trend Area Chart */}
      <div className="grid-60-40" style={{ gridTemplateColumns: '2fr 3fr' }}>
        <PostureScore score={posture.score} />
        <TrendChart data={trends} />
      </div>

      {/* Row 3: Severity Donut + Top Findings table */}
      <div className="grid-60-40" style={{ gridTemplateColumns: '2fr 3fr' }}>
        <SeverityChart
          critical={criticalCount}
          high={highCount}
          medium={mediumCount}
          low={lowCount}
        />
        
        {/* Top Findings Quick table */}
        <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Top Priority Security Alerts
            </h3>
            <Link href="/findings" style={{ fontSize: '13px', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              View All Inventory →
            </Link>
          </div>
          
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Rule</th>
                  <th>Resource</th>
                </tr>
              </thead>
              <tbody>
                {topFindings.length > 0 ? (
                  topFindings.map(finding => (
                    <tr key={finding.id}>
                      <td>
                        <SeverityBadge severity={finding.severity} />
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>{finding.title}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {finding.resourceId.split('/').pop() || finding.resourceId}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No active vulnerabilities detected! 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Remediation Activities feed */}
      <div style={{ width: '100%' }}>
        <RemediationTimeline events={remediations.slice(0, 5)} />
      </div>

    </div>
  );
}
