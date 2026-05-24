'use client';

import React, { useState } from 'react';
import { RemediationEvent } from '@/lib/types';

interface RemediationTimelineProps {
  events: RemediationEvent[];
}

export default function RemediationTimeline({ events }: RemediationTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
        Remediation Activities Audit Log
      </h3>
      
      <div className="timeline">
        {events.length > 0 ? (
          events.map((event) => {
            const isExpanded = expandedId === event.id;
            
            // Try to parse JSON states for readable diff
            let beforeStateFormatted = event.beforeState;
            let afterStateFormatted = event.afterState;
            try {
              beforeStateFormatted = JSON.stringify(JSON.parse(event.beforeState), null, 2);
              afterStateFormatted = JSON.stringify(JSON.parse(event.afterState), null, 2);
            } catch {
              // Standard fallback
            }

            return (
              <div key={event.id} className="timeline-item animate-slide-up">
                {/* Timeline node dot */}
                <div className={`timeline-dot ${event.success ? 'success' : 'failure'}`}></div>
                
                <div 
                  onClick={() => toggleExpand(event.id)}
                  style={{ 
                    marginLeft: '12px', 
                    padding: '16px', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-color-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span className="env-badge" style={{ 
                        marginRight: '8px', 
                        backgroundColor: event.autoRemediated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: event.autoRemediated ? 'var(--accent-green)' : 'var(--accent-blue)',
                        borderColor: event.autoRemediated ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      }}>
                        {event.autoRemediated ? '⚡ AUTO-FIXED' : '🛠️ MANUAL'}
                      </span>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                        {event.actionTaken}
                      </strong>
                    </div>
                    
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: 'monospace' }}>
                    Resource: {event.resourceType} — {event.resourceId.split('/').pop()}
                  </p>
                  
                  {/* Expanded Diff details */}
                  {isExpanded && (
                    <div style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      animation: 'fadeIn 0.2s ease'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 600, textTransform: 'uppercase' }}>
                            Before Configuration
                          </span>
                          <pre style={{ 
                            background: 'rgba(0,0,0,0.3)', 
                            padding: '10px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            color: '#ffa3a3',
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                            marginTop: '4px'
                          }}>
                            {beforeStateFormatted}
                          </pre>
                        </div>
                        
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase' }}>
                            After Configuration
                          </span>
                          <pre style={{ 
                            background: 'rgba(0,0,0,0.3)', 
                            padding: '10px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            color: '#a7f3d0',
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                            marginTop: '4px'
                          }}>
                            {afterStateFormatted}
                          </pre>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Finding Reference ID: {event.findingId.substring(0, 18)}...</span>
                        <span style={{ color: event.success ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                          {event.success ? 'Remediation Verified Successful' : 'Remediation Action Failed'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No remediation history events captured yet.
          </div>
        )}
      </div>
    </div>
  );
}
