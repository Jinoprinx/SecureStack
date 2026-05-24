import React from 'react';

interface StatCardProps {
  label: string;
  value: number;
  trend: number;
  trendDirection: 'up' | 'down';
  icon: string;
  severityClass: 'critical' | 'high' | 'medium' | 'low';
}

export default function StatCard({ label, value, trend, trendDirection, icon, severityClass }: StatCardProps) {
  const getTrendColor = () => {
    // For vulnerability metrics, 'down' is good (green), 'up' is bad (red)
    if (trendDirection === 'down') return 'var(--accent-green)';
    return 'var(--accent-red)';
  };

  return (
    <div className={`card stat-card ${severityClass} animate-slide-up`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </p>
          <h2 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1 }}>
            {value}
          </h2>
        </div>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px'
        }}>
          {icon}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '13px' }}>
        <span style={{
          color: getTrendColor(),
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center'
        }}>
          {trendDirection === 'up' ? '▲' : '▼'} {trend}%
        </span>
        <span style={{ color: 'var(--text-muted)' }}>vs last week</span>
      </div>
    </div>
  );
}
