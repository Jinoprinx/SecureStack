export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingStatus = 'ACTIVE' | 'RESOLVED' | 'SUPPRESSED';
export type ComplianceStatus = 'PASS' | 'FAIL' | 'N/A';
export type Framework = 'CIS' | 'SOC2';

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  resourceType: string;
  resourceId: string;
  status: FindingStatus;
  complianceFramework: Framework[];
  aiExplanation: string;
  timestamp: string;
  generatorId: string;
}

export interface ComplianceControl {
  controlId: string;
  framework: Framework;
  category: string;
  description: string;
  status: ComplianceStatus;
  relatedRules: string[];
  resourcesAffected: number;
}

export interface RemediationEvent {
  id: string;
  findingId: string;
  resourceId: string;
  resourceType: string;
  actionTaken: string;
  beforeState: string;
  afterState: string;
  autoRemediated: boolean;
  timestamp: string;
  success: boolean;
}

export interface PostureScoreData {
  score: number;
  total: number;
  passing: number;
  failing: number;
  byCategory: Record<string, { passing: number; total: number }>;
}

export interface TrendDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface StatCardData {
  label: string;
  value: number;
  trend: number;
  trendDirection: 'up' | 'down';
  icon: string;
  color: string;
}

export interface Tenant {
  tenantId: string;
  accountId: string;
  accountName: string;
  roleArn: string;
  externalId: string;
  connectedAt: string;
}
