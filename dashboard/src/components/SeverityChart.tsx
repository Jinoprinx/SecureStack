'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SeverityChartProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export default function SeverityChart({ critical, high, medium, low }: SeverityChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = [
    { name: 'Critical', value: critical, color: 'var(--accent-red)' },
    { name: 'High', value: high, color: 'var(--accent-amber)' },
    { name: 'Medium', value: medium, color: 'var(--accent-blue)' },
    { name: 'Low', value: low, color: 'var(--accent-green)' },
  ].filter(item => item.value > 0);

  const total = critical + high + medium + low;

  if (!isMounted) {
    return (
      <div className="card animate-slide-up" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Findings by Severity
        </h3>
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Findings by Severity
      </h3>
      
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Pie Chart */}
        <div style={{ width: '50%', height: '200px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0a0f1e', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '6px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{total}</span>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.map((item) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.name}</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
