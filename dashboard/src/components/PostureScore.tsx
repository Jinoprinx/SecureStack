'use client';

import React, { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface PostureScoreProps {
  score: number;
}

export default function PostureScore({ score }: PostureScoreProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  if (!isMounted) {
    return (
      <div className="card animate-slide-up" style={{ height: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'flex-start', marginBottom: '10px' }}>
          Compliance Posture
        </h3>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading chart...</div>
      </div>
    );
  }

  // Data formatted for Recharts radial chart
  const data = [
    {
      name: 'Score',
      value: animatedScore,
      fill: score >= 80 ? 'var(--accent-green)' : score >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)',
    },
  ];

  const getScoreColor = () => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'COMPLIANT';
    if (score >= 60) return 'WARNING';
    return 'CRITICAL RISK';
  };

  return (
    <div className="card animate-slide-up" style={{ height: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'flex-start', marginBottom: '10px' }}>
        Compliance Posture
      </h3>
      
      <div style={{ width: '100%', height: '240px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="80%"
            outerRadius="100%"
            barSize={16}
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'rgba(255,255,255,0.05)' }}
              dataKey="value"
              cornerRadius={8}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        
        {/* Central Text overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '48px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {animatedScore}%
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: getScoreColor(),
            letterSpacing: '1px',
            marginTop: '8px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: `${getScoreColor()}15`
          }}>
            {getScoreLabel()}
          </span>
        </div>
      </div>
    </div>
  );
}
