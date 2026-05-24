'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendDataPoint } from '@/lib/types';

interface TrendChartProps {
  data: TrendDataPoint[];
}

export default function TrendChart({ data }: TrendChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format date labels for X-axis (extract short date e.g. "May 15")
  const formatDate = (dateValue: any) => {
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch {
      return String(dateValue || '');
    }
  };

  if (!isMounted) {
    return (
      <div className="card animate-slide-up" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Open Findings Trend (30 Days)
        </h3>
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Open Findings Trend (30 Days)
      </h3>
      
      <div style={{ flexGrow: 1, width: '100%', height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="var(--text-muted)"
              fontSize={11}
              dy={10}
              tickLine={false}
            />
            
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              dx={-5}
              tickLine={false}
              axisLine={false}
            />
            
            <Tooltip
              contentStyle={{ background: '#0a0f1e', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '6px' }}
              labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px' }}
              itemStyle={{ fontSize: '13px' }}
              labelFormatter={formatDate}
            />
            
            <Area
              type="monotone"
              dataKey="critical"
              stackId="1"
              stroke="var(--accent-red)"
              fillOpacity={1}
              fill="url(#colorCritical)"
            />
            <Area
              type="monotone"
              dataKey="high"
              stackId="1"
              stroke="var(--accent-amber)"
              fillOpacity={1}
              fill="url(#colorHigh)"
            />
            <Area
              type="monotone"
              dataKey="medium"
              stackId="1"
              stroke="var(--accent-blue)"
              fillOpacity={1}
              fill="url(#colorMedium)"
            />
            <Area
              type="monotone"
              dataKey="low"
              stackId="1"
              stroke="var(--accent-green)"
              fillOpacity={1}
              fill="url(#colorLow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
