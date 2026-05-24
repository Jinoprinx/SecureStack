'use client';

import React, { useState } from 'react';
import { ComplianceControl, Framework } from '@/lib/types';

interface ComplianceMatrixProps {
  initialCis: ComplianceControl[];
  initialSoc2: ComplianceControl[];
}

export default function ComplianceMatrix({ initialCis, initialSoc2 }: ComplianceMatrixProps) {
  const [activeTab, setActiveTab] = useState<Framework>('CIS');
  
  const currentControls = activeTab === 'CIS' ? initialCis : initialSoc2;
  
  // Calculate percentage
  const total = currentControls.length;
  const passing = currentControls.filter(c => c.status === 'PASS').length;
  const percentage = total > 0 ? Math.round((passing / total) * 100) : 100;

  // Group by category
  const categories = Array.from(new Set(currentControls.map(c => c.category)));

  const getStatusIcon = (status: ComplianceControl['status']) => {
    switch (status) {
      case 'PASS':
        return <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✅ PASS</span>;
      case 'FAIL':
        return <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>❌ FAIL</span>;
      case 'N/A':
      default:
        return <span style={{ color: 'var(--text-muted)' }}>⏳ N/A</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Stat & Toggle */}
      <div className="card animate-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Compliance score ({activeTab})
            </span>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {percentage}%
            </h2>
          </div>
          
          <div style={{ width: '200px' }}>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: percentage >= 80 ? 'var(--accent-green)' : percentage >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn ${activeTab === 'CIS' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveTab('CIS')}
            style={{ padding: '8px 20px' }}
          >
            CIS Benchmark
          </button>
          <button 
            className={`btn ${activeTab === 'SOC2' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveTab('SOC2')}
            style={{ padding: '8px 20px' }}
          >
            SOC 2 Type II
          </button>
        </div>
      </div>

      {/* Grid mapping grouped by categories */}
      {categories.map((category) => {
        const categoryControls = currentControls.filter(c => c.category === category);
        return (
          <div key={category} className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-blue)', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
              {category}
            </h3>
            
            <div className="table-wrapper">
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Control ID</th>
                    <th>Description</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Resources Affected</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryControls.map((control) => (
                    <tr key={control.controlId}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{control.controlId}</td>
                      <td>{control.description}</td>
                      <td>{getStatusIcon(control.status)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: control.resourcesAffected > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                        {control.resourcesAffected} {control.resourcesAffected > 0 ? '⚠️' : '✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
