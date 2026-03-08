'use client';

import React, { useMemo, useState } from 'react';
import { Container, Header, SpaceBetween, Box } from '@cloudscape-design/components';
import { KPIs } from '../lib/metrics';

interface FunnelItem {
  stage: string;
  count: number;
}

interface WhatIfScenarioPanelProps {
  funnelData: FunnelItem[];
  kpis: KPIs | null;
}

function formatMillions(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function WhatIfScenarioPanel({ funnelData: _funnelData, kpis }: WhatIfScenarioPanelProps) {
  const [sliderValue, setSliderValue] = useState(10);

  const scenario = useMemo(() => {
    const totalLeads = kpis?.totalLeads ?? 0;
    const delivered = kpis?.deliveredVehicles ?? 0;
    const totalRevenue = kpis?.totalRevenue ?? 0;

    const currentRate = totalLeads > 0 ? delivered / totalLeads : 0;
    const simulatedRate = Math.min(1, currentRate + sliderValue / 100);

    const expectedDeliveries = Math.round(totalLeads * simulatedRate);
    const additionalDeliveries = Math.max(0, expectedDeliveries - delivered);

    const avgRevenuePerVehicle = delivered > 0 ? totalRevenue / delivered : 0;
    const additionalRevenue = additionalDeliveries * avgRevenuePerVehicle;

    return {
      currentRate,
      simulatedRate,
      additionalDeliveries,
      additionalRevenue,
    };
  }, [kpis, sliderValue]);

  const metricStyle: React.CSSProperties = {
    background: '#f8f8f8',
    borderRadius: 8,
    padding: '16px 20px',
    flex: '1 1 140px',
    minWidth: 0,
  };

  return (
    <Container
      header={
        <Header
          variant="h2"
          description="Estimate how improving lead conversion affects deliveries and revenue."
        >
          Revenue Impact Simulator
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="m">
        <SpaceBetween direction="vertical" size="xs">
          <Box fontSize="body-s" fontWeight="bold">
            Conversion improvement (percentage points): <strong>+{sliderValue}</strong>
          </Box>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#1f77b4', cursor: 'pointer' }}
          />
          <Box fontSize="body-s" color="text-body-secondary" float="right">
            0 pts &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; +30 pts
          </Box>
        </SpaceBetween>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={metricStyle}>
            <Box fontSize="body-s" color="text-body-secondary">Current Conversion</Box>
            <Box fontSize="heading-m" fontWeight="bold">{(scenario.currentRate * 100).toFixed(1)}%</Box>
          </div>
          <div style={metricStyle}>
            <Box fontSize="body-s" color="text-body-secondary">Simulated Conversion</Box>
            <Box fontSize="heading-m" fontWeight="bold" color="text-status-info">{(scenario.simulatedRate * 100).toFixed(1)}%</Box>
          </div>
          <div style={metricStyle}>
            <Box fontSize="body-s" color="text-body-secondary">Additional Deliveries</Box>
            <Box fontSize="heading-m" fontWeight="bold">+{scenario.additionalDeliveries}</Box>
          </div>
          <div style={metricStyle}>
            <Box fontSize="body-s" color="text-body-secondary">Incremental Revenue</Box>
            <Box fontSize="heading-m" fontWeight="bold" color="text-status-success">+{formatMillions(scenario.additionalRevenue)}</Box>
          </div>
        </div>

        {sliderValue > 0 && (
          <Box fontSize="body-s" color="text-body-secondary">
            Improving conversion from <strong>{(scenario.currentRate * 100).toFixed(1)}%</strong> to{' '}
            <strong>{(scenario.simulatedRate * 100).toFixed(1)}%</strong> could yield{' '}
            <strong>+{scenario.additionalDeliveries} deliveries</strong> and approximately{' '}
            <strong>+{formatMillions(scenario.additionalRevenue)}</strong> in incremental revenue.
          </Box>
        )}
      </SpaceBetween>
    </Container>
  );
}
