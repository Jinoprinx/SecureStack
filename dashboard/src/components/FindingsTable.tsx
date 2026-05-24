'use client';

import React, { useState } from 'react';
import { Finding, Severity, FindingStatus } from '@/lib/types';
import SeverityBadge from './SeverityBadge';

interface FindingsTableProps {
  initialFindings: Finding[];
}

export default function FindingsTable({ initialFindings }: FindingsTableProps) {
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');
  
  // Sorting state
  const [sortField, setSortField] = useState<'severity' | 'title' | 'timestamp' | 'status'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Toggle expanded row
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Perform remediation (simulated action)
  const handleRemediate = (id: string) => {
    alert(`Initiating automated remediation for finding: ${id}`);
    setFindings(prev => 
      prev.map(f => f.id === id ? { ...f, status: 'RESOLVED' as FindingStatus } : f)
    );
  };

  // Suppress finding (simulated action)
  const handleSuppress = (id: string) => {
    setFindings(prev => 
      prev.map(f => f.id === id ? { ...f, status: 'SUPPRESSED' as FindingStatus } : f)
    );
  };

  // Sort logic helpers
  const severityWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Unique resource types for dropdown filter
  const resourceTypes = Array.from(new Set(initialFindings.map(f => f.resourceType)));

  // Filter and sort the findings
  const filteredFindings = findings
    .filter(finding => {
      const matchesSearch = finding.title.toLowerCase().includes(search.toLowerCase()) || 
                            finding.resourceId.toLowerCase().includes(search.toLowerCase());
      const matchesSeverity = severityFilter === 'ALL' || finding.severity === severityFilter;
      const matchesStatus = statusFilter === 'ALL' || finding.status === statusFilter;
      const matchesResource = resourceFilter === 'ALL' || finding.resourceType === resourceFilter;
      
      return matchesSearch && matchesSeverity && matchesStatus && matchesResource;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'severity') {
        comparison = (severityWeight[a.severity] || 0) - (severityWeight[b.severity] || 0);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Paginated chunk
  const totalPages = Math.ceil(filteredFindings.length / itemsPerPage);
  const paginatedFindings = filteredFindings.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getStatusBadgeClass = (status: FindingStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'status-badge-active';
      case 'RESOLVED':
        return 'status-badge-resolved';
      case 'SUPPRESSED':
        return 'status-badge-suppressed';
    }
  };

  return (
    <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by rule or resource ID..."
          className="text-input"
          style={{ flexGrow: 1, minWidth: '240px' }}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="select-input"
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            className="select-input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
            <option value="SUPPRESSED">Suppressed</option>
          </select>

          <select
            className="select-input"
            value={resourceFilter}
            onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Resource Types</option>
            {resourceTypes.map(type => (
              <option key={type} value={type}>{type.replace('Aws', '')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('severity')}>
                Severity {sortField === 'severity' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('title')}>
                Finding / Rule {sortField === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th>Resource ID</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('timestamp')}>
                Detected {sortField === 'timestamp' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedFindings.length > 0 ? (
              paginatedFindings.map(finding => {
                const isExpanded = expandedId === finding.id;
                
                // Parse AI Explanation if structured
                let aiExplainObj = { whatHappened: '', whyRisky: '', howToFix: '' };
                try {
                  if (finding.aiExplanation) {
                    aiExplainObj = JSON.parse(finding.aiExplanation);
                  }
                } catch {
                  // Fallback if it is regular string
                  aiExplainObj.whatHappened = finding.aiExplanation;
                }

                return (
                  <React.Fragment key={finding.id}>
                    <tr onClick={() => toggleExpand(finding.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <SeverityBadge severity={finding.severity} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{finding.title}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {finding.resourceId.split('/').pop() || finding.resourceId}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(finding.status)}`}>
                          {finding.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(finding.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                    
                    {/* Expandable Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
                            
                            <div>
                              <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Resource Type & ARN
                              </h4>
                              <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--accent-blue)' }}>
                                {finding.resourceType} — {finding.resourceId}
                              </p>
                            </div>

                            {finding.aiExplanation ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <div>
                                    <h4 style={{ fontSize: '12px', color: 'var(--accent-red)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                                      ⚡ What Happened (AI Analysis)
                                    </h4>
                                    <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                      {aiExplainObj.whatHappened || finding.aiExplanation}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 style={{ fontSize: '12px', color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>
                                      ⚠️ Business & Security Risk
                                    </h4>
                                    <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                      {aiExplainObj.whyRisky || 'Resource lacks compliance checks and is open to configuration violations.'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.03)', paddingLeft: '24px' }}>
                                  <h4 style={{ fontSize: '12px', color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 700 }}>
                                    🔧 How to Fix Manually
                                  </h4>
                                  <div style={{
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'pre-line',
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.02)'
                                  }}>
                                    {aiExplainObj.howToFix || '1. Access AWS console.\n2. Verify resource parameters.\n3. Turn on security policies.'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                  Description
                                </h4>
                                <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{finding.description}</p>
                              </div>
                            )}

                            {/* Actions footer */}
                            {finding.status === 'ACTIVE' && (
                              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
                                <button className="btn btn-ghost" onClick={() => handleSuppress(finding.id)}>
                                  Suppress Finding
                                </button>
                                <button className="btn btn-primary" onClick={() => handleRemediate(finding.id)}>
                                  ⚡ Auto-Remediate Now
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No findings match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing page {page} of {totalPages} ({filteredFindings.length} findings)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-ghost"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <button
              className="btn btn-ghost"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
