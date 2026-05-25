'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [envName, setEnvName] = useState('DEV ENVIRONMENT');

  useEffect(() => {
    const tenant = typeof window !== 'undefined' ? sessionStorage.getItem('selectedTenantId') : null;
    if (tenant === 'tenant-prod') {
      setEnvName('PROD ENVIRONMENT');
    } else if (tenant === 'tenant-staging') {
      setEnvName('STAGING ENVIRONMENT');
    } else {
      setEnvName('DEV ENVIRONMENT');
    }
  }, []);

  const links = [
    { href: '/', label: 'Overview', icon: '🛡️' },
    { href: '/findings', label: 'Findings', icon: '🔍' },
    { href: '/compliance', label: 'Compliance', icon: '✅' },
    { href: '/remediation', label: 'Remediation', icon: '🔧' },
    { href: '/connect', label: 'Connect Account', icon: '🔌' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">SecureStack ⚡</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span style={{ fontSize: '18px' }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <span className="env-badge">{envName}</span>
      </div>
    </aside>
  );
}
