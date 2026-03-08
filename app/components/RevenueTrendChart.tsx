'use client';

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Container, Header, SpaceBetween, Box } from "@cloudscape-design/components";
import { RevenueTrendData, FilterOptions } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
  filters?: FilterOptions;
  branches?: { label: string; value: string }[];
}

const RECENT_COUNT = 2;
const BASE_COLOR = "#b8c4ce";

const formatYAxis = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

const parseMonthLabel = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  return d.toLocaleString('default', { month: 'short' });
};

const parseFullMonthLabel = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const generateInsightLine = (
  data: RevenueTrendData[],
  filters?: FilterOptions,
  branches?: { label: string; value: string }[]
): string => {
  if (!data || data.length < 2) return '';

  const selectedBranchIds = [
    ...(filters?.branchIds ?? []),
    ...(filters?.branchId ? [filters.branchId] : []),
  ].filter(Boolean);
  const branchName =
    selectedBranchIds.length === 1 && branches
      ? (branches.find(b => b.value === selectedBranchIds[0])?.label ?? null)
      : null;
  const subject = branchName ? `${branchName} revenue` : 'Revenue';

  const first = data[0].revenue;
  const last  = data[data.length - 1].revenue;
  const overallPct = first > 0 ? ((last - first) / first) * 100 : 0;

  // Find top 2 months by month-over-month gain
  const gains: { month: string; gain: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].revenue;
    if (prev > 0) {
      gains.push({
        month: parseMonthLabel(data[i].date),
        gain: ((data[i].revenue - prev) / prev) * 100,
      });
    }
  }
  const topGains = [...gains]
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 2)
    .filter(g => g.gain > 0)
    .map(g => g.month);

  const direction = overallPct >= 0 ? 'increased' : 'declined';
  const absPct = Math.abs(overallPct).toFixed(0);

  if (topGains.length >= 2 && Math.abs(overallPct) >= 5) {
    return `${subject} ${direction} ${absPct}% across the period, driven by strong growth in ${topGains[0]} and ${topGains[1]}.`;
  }
  if (topGains.length === 1 && Math.abs(overallPct) >= 5) {
    return `${subject} ${direction} ${absPct}% across the period, with the strongest growth in ${topGains[0]}.`;
  }
  if (Math.abs(overallPct) >= 5) {
    return `${subject} ${direction} ${absPct}% across the period.`;
  }
  return `${subject} held broadly stable across the period at ${formatYAxis(Math.round((first + last) / 2))} average.`;
};

const generateTitle = (
  data: RevenueTrendData[],
  filters?: FilterOptions,
  branches?: { label: string; value: string }[]
): string => {
  if (!data || data.length < 2) return "Revenue Trend";

  const selectedBranchIds = [
    ...(filters?.branchIds ?? []),
    ...(filters?.branchId ? [filters.branchId] : []),
  ].filter(Boolean);
  const branchName =
    selectedBranchIds.length === 1 && branches
      ? (branches.find(b => b.value === selectedBranchIds[0])?.label ?? null)
      : null;
  const subject = branchName ? `${branchName} revenue` : "Network revenue";

  const last = data[data.length - 1].revenue;
  const prev = data[data.length - 2].revenue;
  const recentPct = prev > 0 ? ((last - prev) / prev) * 100 : 0;

  // Detect dip-and-recovery: trough not at endpoints, followed by 15%+ recovery
  if (data.length >= 4) {
    const minIdx = data.reduce(
      (minI, d, i, arr) => (d.revenue < arr[minI].revenue ? i : minI),
      0
    );
    if (minIdx > 0 && minIdx < data.length - 1) {
      const minVal = data[minIdx].revenue;
      if (data[data.length - 1].revenue > minVal * 1.15) {
        const parts = data[minIdx].date.split('-');
        const dipMonth = new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
          .toLocaleString('default', { month: 'long' });
        return `${subject} recovered strongly after the ${dipMonth} dip.`;
      }
    }
  }

  if (recentPct >= 20) return `${subject} increased sharply in the latest period.`;
  if (recentPct >= 5)  return `${subject} growth accelerated in the most recent months.`;
  if (recentPct <= -20) return `${subject} declined sharply in the most recent period.`;
  if (recentPct <= -5)  return `${subject} declined in the most recent period.`;

  const first = data[0].revenue;
  const overallPct = first > 0 ? ((last - first) / first) * 100 : 0;
  if (overallPct >= 20)  return `${subject} has grown steadily across the period.`;
  if (overallPct <= -20) return `${subject} has trended downward across the period.`;
  return `${subject} remains stable across the period.`;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number | null }[];
  label?: string;
}) => {
  if (!active || !payload?.length || !label) return null;
  const recent = payload.find(p => p.dataKey === 'recentRevenue' && p.value != null);
  const base   = payload.find(p => p.dataKey === 'baseRevenue'   && p.value != null);
  const entry  = recent ?? base;
  if (!entry || entry.value == null) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8eaf0',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 13,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 600, color: '#0d1b2e', marginBottom: 4 }}>
        {parseFullMonthLabel(label)}
      </div>
      <div style={{ color: '#5f6b7a' }}>
        Revenue:{' '}
        <strong style={{ color: '#0d1b2e' }}>${Number(entry.value).toLocaleString()}</strong>
      </div>
    </div>
  );
};

export default function RevenueTrendChart({ data, filters, branches }: RevenueTrendChartProps) {
  const title       = useMemo(() => generateTitle(data, filters, branches),       [data, filters, branches]);
  const insightLine = useMemo(() => generateInsightLine(data, filters, branches), [data, filters, branches]);

  const transformedData = useMemo(() => {
    const pivot = Math.max(0, data.length - RECENT_COUNT);
    return data.map((d, i) => ({
      ...d,
      baseRevenue:   i <= pivot ? d.revenue : null as number | null,
      recentRevenue: i >= pivot ? d.revenue : null as number | null,
    }));
  }, [data]);

  return (
    <Container header={<Header variant="h2">{title}</Header>}>
      <SpaceBetween size="m" direction="vertical">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={transformedData}
          margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaf0" />
          <XAxis
            dataKey="date"
            tickFormatter={parseMonthLabel}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#5f6b7a', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#5f6b7a', fontSize: 12 }}
            label={{
              value: 'Revenue ($)',
              angle: -90,
              position: 'insideLeft',
              offset: 20,
              style: { textAnchor: 'middle', fill: '#5f6b7a', fontSize: 11 },
            }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Earlier months — muted gray */}
          <Line
            type="linear"
            dataKey="baseRevenue"
            stroke={BASE_COLOR}
            strokeWidth={2}
            dot={{ fill: BASE_COLOR, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            legendType="none"
            isAnimationActive={false}
          />
          {/* Recent months — primary theme blue */}
          <Line
            type="linear"
            dataKey="recentRevenue"
            stroke={CHART_COLORS.revenue}
            strokeWidth={2.5}
            dot={{ fill: CHART_COLORS.revenue, r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
            legendType="none"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <Box fontSize="body-s" color="text-body-secondary">
        <div style={{ minHeight: '2.5rem' }}>{insightLine}</div>
      </Box>
      </SpaceBetween>
    </Container>
  );
}