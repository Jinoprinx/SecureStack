import { mockFindings, mockCISControls, mockSOC2Controls, mockRemediationEvents, mockTrendData } from './mockData';
import { Finding, ComplianceControl, RemediationEvent, PostureScoreData, TrendDataPoint, Tenant } from './types';

const DELAY_MS = 300;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function getActiveTenantId(): string {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('selectedTenantId') || 'tenant-prod';
  }
  return 'tenant-prod';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const tenantId = getActiveTenantId();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId
      }
    });
    if (!res.ok) {
      console.warn(`API call failed for ${path}: ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Failed to fetch from real API: ${err}`);
    return null;
  }
}

export async function fetchTenants(): Promise<Tenant[]> {
  const realData = await apiFetch<Tenant[]>('/tenants');
  if (realData) return realData;

  await delay(DELAY_MS);
  // Read local tenants list or default
  if (typeof window !== 'undefined') {
    const localTenants = sessionStorage.getItem('custom_tenants');
    if (localTenants) {
      try {
        return JSON.parse(localTenants);
      } catch (e) {
        // Fallback
      }
    }
  }
  return [
    {
      tenantId: 'tenant-prod',
      accountId: '123456789012',
      accountName: 'Production Account',
      roleArn: 'arn:aws:iam::123456789012:role/SecureStackSaaSConnector',
      externalId: 'ext-12345-abcde',
      connectedAt: '2026-05-23T10:00:00Z'
    },
    {
      tenantId: 'tenant-staging',
      accountId: '987654321098',
      accountName: 'Staging Account',
      roleArn: 'arn:aws:iam::987654321098:role/SecureStackSaaSConnector',
      externalId: 'ext-98765-fedcb',
      connectedAt: '2026-05-23T12:00:00Z'
    }
  ];
}

export async function connectTenant(body: Omit<Tenant, 'connectedAt'>): Promise<Tenant> {
  const realData = await apiFetch<Tenant>('/tenants/connect', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (realData) return realData;

  await delay(DELAY_MS);
  const newTenant: Tenant = {
    ...body,
    connectedAt: new Date().toISOString()
  };
  
  if (typeof window !== 'undefined') {
    const tenants = await fetchTenants();
    tenants.push(newTenant);
    sessionStorage.setItem('custom_tenants', JSON.stringify(tenants));
    sessionStorage.setItem('selectedTenantId', newTenant.tenantId);
  }
  
  return newTenant;
}

export async function fetchFindings(): Promise<Finding[]> {
  const realData = await apiFetch<any>('/findings');
  if (realData) return Array.isArray(realData) ? realData : (realData.items || []);

  await delay(DELAY_MS);
  const tenantId = getActiveTenantId();
  if (tenantId === 'tenant-staging') {
    // Return fewer findings to make staging look cleaner
    return mockFindings.filter(f => f.severity === 'LOW' || f.severity === 'MEDIUM');
  } else if (tenantId.startsWith('tenant-custom') || !['tenant-prod', 'tenant-staging'].includes(tenantId)) {
    // Custom added accounts start clean
    return mockFindings.slice(0, 2).map(f => ({ ...f, status: 'RESOLVED' }));
  }
  return mockFindings;
}

export async function fetchPostureScore(): Promise<PostureScoreData> {
  const realData = await apiFetch<PostureScoreData>('/posture-score');
  if (realData) return realData;

  await delay(DELAY_MS);
  const findings = await fetchFindings();
  const total = findings.length;
  const failing = findings.filter(f => f.status === 'ACTIVE').length;
  const passing = total - failing;
  const score = total > 0 ? Math.round((passing / total) * 100) : 100;
  
  // Calculate by category
  const byCategory: Record<string, { passing: number; total: number }> = {};
  findings.forEach(f => {
    const category = f.resourceType.replace('Aws', '');
    if (!byCategory[category]) {
      byCategory[category] = { passing: 0, total: 0 };
    }
    byCategory[category].total += 1;
    if (f.status === 'RESOLVED') {
      byCategory[category].passing += 1;
    }
  });

  return {
    score,
    total,
    passing,
    failing,
    byCategory
  };
}

export async function fetchCompliance(framework: 'CIS' | 'SOC2'): Promise<{ compliancePercentage: number; controls: ComplianceControl[] }> {
  const realData = await apiFetch<{ compliancePercentage: number; controls: ComplianceControl[] }>(`/compliance/${framework}`);
  if (realData) return realData;

  await delay(DELAY_MS);
  const findings = await fetchFindings();
  const mockComplianceControls = [...mockCISControls, ...mockSOC2Controls];
  const baseControls = mockComplianceControls.filter(c => c.framework === framework);
  
  // Dynamically update controls pass/fail status based on filtered findings
  const failingRules = new Set(findings.filter(f => f.status === 'ACTIVE').map(f => f.generatorId.split('/').pop()));
  
  const controls = baseControls.map(ctrl => {
    const isFailing = ctrl.relatedRules.some(r => failingRules.has(r));
    const status = isFailing ? 'FAIL' as const : 'PASS' as const;
    return {
      ...ctrl,
      status,
      resourcesAffected: isFailing ? 1 : 0
    };
  });
  
  const total = controls.length;
  const passing = controls.filter(c => c.status === 'PASS').length;
  const compliancePercentage = total > 0 ? Math.round((passing / total) * 100) : 100;
  
  return {
    compliancePercentage,
    controls
  };
}

export async function fetchRemediationHistory(): Promise<RemediationEvent[]> {
  const realData = await apiFetch<any>('/remediation-history');
  if (realData) return Array.isArray(realData) ? realData : (realData.items || []);

  await delay(DELAY_MS);
  const tenantId = getActiveTenantId();
  if (tenantId === 'tenant-staging') {
    return mockRemediationEvents.slice(0, 5);
  } else if (tenantId !== 'tenant-prod') {
    return [];
  }
  return mockRemediationEvents;
}

export async function fetchTrends(): Promise<TrendDataPoint[]> {
  const realData = await apiFetch<TrendDataPoint[]>('/trends');
  if (realData) return realData;

  await delay(DELAY_MS);
  const tenantId = getActiveTenantId();
  if (tenantId === 'tenant-staging') {
    // Dynamic staging trends
    return mockTrendData.map(d => ({
      ...d,
      critical: 0,
      high: Math.max(0, d.high - 8),
      medium: Math.max(0, d.medium - 15),
      low: Math.max(0, d.low - 10)
    }));
  } else if (tenantId !== 'tenant-prod') {
    return mockTrendData.map(d => ({
      date: d.date,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }));
  }
  return mockTrendData;
}
