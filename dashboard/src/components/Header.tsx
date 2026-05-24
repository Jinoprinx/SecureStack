'use client';

import { usePathname } from 'next/navigation';
import TenantSelector from './TenantSelector';

export default function Header() {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Security Posture Overview';
      case '/findings':
        return 'Vulnerability & Findings Inventory';
      case '/compliance':
        return 'Compliance Standards Audit';
      case '/remediation':
        return 'Remediation Activity Log';
      case '/connect':
        return 'Connect AWS Account';
      default:
        return 'SecureStack Security';
    }
  };

  return (
    <header className="main-header animate-fade-in">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          {getPageTitle()}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Real-time self-healing security compliance engine.
        </p>
      </div>
      <div className="header-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <TenantSelector />
        <div style={{ borderLeft: '1px solid var(--border-color)', height: '24px' }}></div>
        <div>
          <span className="env-badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            Region: us-east-1
          </span>
        </div>
      </div>
    </header>
  );
}
