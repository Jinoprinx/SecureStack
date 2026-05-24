import React from 'react';
import { Severity } from '@/lib/types';

interface SeverityBadgeProps {
  severity: Severity;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const getBadgeClass = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'severity-badge-critical';
      case 'HIGH':
        return 'severity-badge-high';
      case 'MEDIUM':
        return 'severity-badge-medium';
      case 'LOW':
      default:
        return 'severity-badge-low';
    }
  };

  const getDotColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'var(--accent-red)';
      case 'HIGH':
        return 'var(--accent-amber)';
      case 'MEDIUM':
        return 'var(--accent-blue)';
      case 'LOW':
      default:
        return 'var(--accent-green)';
    }
  };

  return (
    <span className={`severity-badge ${getBadgeClass()}`}>
      <span style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: getDotColor()
      }}></span>
      {severity}
    </span>
  );
}
