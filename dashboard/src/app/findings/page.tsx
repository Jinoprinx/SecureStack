'use client';

import React, { useEffect, useState } from 'react';
import { fetchFindings } from '@/lib/api';
import { Finding } from '@/lib/types';
import FindingsTable from '@/components/FindingsTable';

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchFindings();
        setFindings(data);
      } catch (e) {
        console.error('Failed to fetch findings', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Browse, search, and analyze all configuration issues and security violations detected across AWS.
        </p>
      </div>
      
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span>Loading findings inventory...</span>
          </div>
        </div>
      ) : (
        <FindingsTable initialFindings={findings} />
      )}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
