'use client';

import React, { useEffect, useState } from 'react';
import { fetchCompliance } from '@/lib/api';
import { ComplianceControl } from '@/lib/types';
import ComplianceMatrix from '@/components/ComplianceMatrix';

export default function CompliancePage() {
  const [cisData, setCisData] = useState<{ compliancePercentage: number; controls: ComplianceControl[] } | null>(null);
  const [soc2Data, setSoc2Data] = useState<{ compliancePercentage: number; controls: ComplianceControl[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [cis, soc2] = await Promise.all([
          fetchCompliance('CIS'),
          fetchCompliance('SOC2')
        ]);
        setCisData(cis);
        setSoc2Data(soc2);
      } catch (e) {
        console.error('Failed to fetch compliance details', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
        Audit your active infrastructure configurations against industry security baselines (CIS AWS Foundations Benchmark and SOC 2 Type II).
      </p>
      
      {isLoading || !cisData || !soc2Data ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span>Loading compliance matrix...</span>
          </div>
        </div>
      ) : (
        <ComplianceMatrix 
          initialCis={cisData.controls} 
          initialSoc2={soc2Data.controls} 
        />
      )}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
