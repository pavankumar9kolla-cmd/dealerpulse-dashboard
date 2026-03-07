'use client';

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { Container, Header, Select, SpaceBetween } from "@cloudscape-design/components";
import { BranchPerformanceData } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

interface BranchPerformanceChartProps {
  data: BranchPerformanceData[];
  onBranchClick?: (branchName: string) => void;
}

export default function BranchPerformanceChart({ data, onBranchClick }: BranchPerformanceChartProps) {
  const [metric, setMetric] = React.useState<'revenue' | 'orders' | 'conversionRate'>('revenue');
  const averageRevenue = data.length > 0 ? data.reduce((sum, d) => sum + d.revenue, 0) / data.length : 0;

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue': return 'Revenue';
      case 'orders': return 'Orders';
      case 'conversionRate': return 'Conversion Rate (%)';
    }
  };

  const getDataKey = () => {
    switch (metric) {
      case 'revenue': return 'revenue';
      case 'orders': return 'orders';
      case 'conversionRate': return 'conversionRate';
    }
  };

  const formatTooltip = (value: number) => {
    switch (metric) {
      case 'revenue': return `$${value.toLocaleString()}`;
      case 'conversionRate': return `${value.toFixed(1)}%`;
      default: return value.toString();
    }
  };

  const getBarColor = (branch: BranchPerformanceData) => {
    if (branch.revenue > averageRevenue * 1.1) return CHART_COLORS.strong;
    if (branch.revenue < averageRevenue * 0.9) return CHART_COLORS.risk;
    return CHART_COLORS.caution;
  };

  return (
    <Container header={<Header>Branch Performance</Header>}>
      <SpaceBetween size="m" direction="vertical">
        <Select
          selectedOption={{ label: getMetricLabel(), value: metric }}
          onChange={({ detail }) => setMetric(detail.selectedOption.value as any)}
          options={[
            { label: 'Revenue', value: 'revenue' },
            { label: 'Orders', value: 'orders' },
            { label: 'Conversion Rate', value: 'conversionRate' }
          ]}
        />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={(data) => {
              if (data && data.activeLabel && onBranchClick) {
                onBranchClick(String(data.activeLabel));
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="branch" />
            <YAxis />
            <Tooltip
              formatter={(value) => {
                if (value === undefined || value === null) return ['N/A', getMetricLabel()];
                const numValue = Number(value);
                return [formatTooltip(numValue), getMetricLabel()];
              }}
              labelFormatter={(label) => {
                const branch = data.find((b) => b.branch === label);
                if (!branch) return `Branch: ${label}`;
                return `Branch: ${label} | Revenue: $${branch.revenue.toLocaleString()} | Orders: ${branch.orders} | Conversion: ${branch.conversionRate.toFixed(1)}%`;
              }}
            />
            <Legend />
            <Bar dataKey={getDataKey()} name={getMetricLabel()}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#5f6b7a" }}>
          <span><span style={{ color: CHART_COLORS.strong }}>■</span> Above network average</span>
          <span><span style={{ color: CHART_COLORS.caution }}>■</span> Near average performance</span>
          <span><span style={{ color: CHART_COLORS.risk }}>■</span> Below network average</span>
        </div>
      </SpaceBetween>
    </Container>
  );
}