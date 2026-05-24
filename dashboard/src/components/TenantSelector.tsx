'use client';

import React, { useEffect, useState } from 'react';
import { fetchTenants, getActiveTenantId } from '@/lib/api';
import { Tenant } from '@/lib/types';

export default function TenantSelector() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('tenant-prod');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchTenants();
        setTenants(data);
        const active = getActiveTenantId();
        setSelectedTenant(active);
      } catch (e) {
        console.error('Failed to load tenants list', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTenant(val);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedTenantId', val);
      // Reload page to refresh context queries globally
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: '38px', color: 'var(--text-muted)', fontSize: '13px' }}>
        Loading account context...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label htmlFor="tenant-select" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
        Active Account:
      </label>
      <select
        id="tenant-select"
        value={selectedTenant}
        onChange={handleChange}
        style={{
          background: 'rgba(10, 15, 30, 0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'var(--text-primary)',
          borderRadius: '6px',
          padding: '6px 28px 6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          outline: 'none',
          cursor: 'pointer',
          transition: 'border 0.2s',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '16px'
        }}
      >
        {tenants.map(t => (
          <option key={t.tenantId} value={t.tenantId} style={{ background: '#0a0f1e', color: 'white' }}>
            {t.accountName} ({t.accountId})
          </option>
        ))}
      </select>
    </div>
  );
}
