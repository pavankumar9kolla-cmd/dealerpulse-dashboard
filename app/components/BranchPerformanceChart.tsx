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
  LabelList,
  ReferenceLine,
} from "recharts";
import { Container, Header, Select, SpaceBetween } from "@cloudscape-design/components";
import { BranchPerformanceData, FilterOptions } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

const BEST_COLOR  = CHART_COLORS.revenue;
const WORST_COLOR = CHART_COLORS.risk;
const BASE_COLOR  = "#d4d9de";

type Metric = 'revenue' | 'orders' | 'conversionRate';

const formatMillions = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

const metricLabel: Record<Metric, string> = {
  revenue:        'Revenue',
  orders:         'Orders',
  conversionRate: 'Conversion Rate',
};

const formatValue = (metric: Metric, value: number, long = false): string => {
  switch (metric) {
    case 'revenue':        return long ? `$${value.toLocaleString()}` : formatMillions(value);
    case 'conversionRate': return `${value.toFixed(1)}%`;
    default:               return String(Math.round(value));
  }
};

const generateTitle = (
  sorted: (BranchPerformanceData & { rank: number })[],
  metric: Metric,
  isSingle: boolean,
  isSubset: boolean,
): string => {
  if (!sorted.length) return 'Branch Performance';

  const best  = sorted[0];
  const worst = sorted[sorted.length - 1];
  const scope = isSubset ? 'among the selected branches' : 'across the network';

  if (isSingle) {
    switch (metric) {
      case 'revenue':        return `${best.branch} generated ${formatMillions(best.revenue)} revenue during this period.`;
      case 'orders':         return `${best.branch} placed ${best.orders} vehicle orders during this period.`;
      case 'conversionRate': return `${best.branch} converted ${best.conversionRate.toFixed(1)}% of leads into deliveries.`;
    }
  }

  switch (metric) {
    case 'revenue':
      return `${best.branch} leads ${scope} while ${worst.branch} significantly underperforms.`;
    case 'orders':
      return `${best.branch} leads in vehicle orders while ${worst.branch} trails ${isSubset ? 'the selection' : 'the network'}.`;
    case 'conversionRate':
      return `${best.branch} achieves the highest lead conversion rate ${scope}.`;
  }
};

interface BranchPerformanceChartProps {
  data: BranchPerformanceData[];
  filters?: FilterOptions;
  branches?: { label: string; value: string }[];
  onBranchClick?: (branchName: string) => void;
}

export default function BranchPerformanceChart({
  data,
  filters,
  onBranchClick,
}: BranchPerformanceChartProps) {
  const [metric, setMetric] = React.useState<Metric>('revenue');

  const selectedBranchIds = [
    ...(filters?.branchIds ?? []),
    ...(filters?.branchId ? [filters.branchId] : []),
  ].filter(Boolean);
  const isSingle = data.length <= 1;
  const isSubset = selectedBranchIds.length > 1;

  // Sort descending by selected metric and add rank
  const sorted = React.useMemo(() => {
    return [...data]
      .sort((a, b) => (b[metric] as number) - (a[metric] as number))
      .map((d, i) => ({ ...d, rank: i + 1, rankedBranch: `#${i + 1} ${d.branch}` }));
  }, [data, metric]);

  const values  = sorted.map(d => d[metric] as number);
  const maxVal  = values[0] ?? 0;
  const minVal  = values[values.length - 1] ?? 0;
  const avgVal  = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;

  const getBarColor = (entry: BranchPerformanceData & { rank: number }) => {
    if (isSingle) return BEST_COLOR;
    const v = entry[metric] as number;
    if (v === maxVal) return BEST_COLOR;
    if (v === minVal) return WORST_COLOR;
    return BASE_COLOR;
  };

  const avgLabel = (() => {
    switch (metric) {
      case 'revenue':        return `Network Avg: ${formatMillions(avgVal)}`;
      case 'orders':         return `Network Avg: ${Math.round(avgVal)} Orders`;
      case 'conversionRate': return `Network Avg: ${avgVal.toFixed(1)}%`;
    }
  })();

  const title = generateTitle(sorted, metric, isSingle, isSubset);

  return (
    <Container header={<Header variant="h2">{title}</Header>}>
      <SpaceBetween size="m" direction="vertical">
        <Select
          selectedOption={{ label: metricLabel[metric], value: metric }}
          onChange={({ detail }) => setMetric(detail.selectedOption.value as Metric)}
          options={[
            { label: 'Revenue',         value: 'revenue' },
            { label: 'Orders',          value: 'orders' },
            { label: 'Conversion Rate', value: 'conversionRate' },
          ]}
        />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={sorted}
            margin={{ top: 20, right: 50, left: 10, bottom: 5 }}
            onClick={(chartData: any) => {
              const branch = chartData?.activePayload?.[0]?.payload?.branch;
              if (branch && onBranchClick) {
                onBranchClick(String(branch));
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaf0" />
            <XAxis
              dataKey="rankedBranch"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5f6b7a', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => formatValue(metric, v)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5f6b7a', fontSize: 12 }}
              width={65}
            />
            <Tooltip
              formatter={(value) => {
                if (value === undefined || value === null) return ['N/A', metricLabel[metric]];
                return [formatValue(metric, Number(value), true), metricLabel[metric]];
              }}
              labelFormatter={(label) => {
                const entry = sorted.find(d => d.rankedBranch === label);
                if (!entry) return label;
                return `${entry.branch} — ${formatMillions(entry.revenue)} rev · ${entry.orders} orders · ${entry.conversionRate.toFixed(1)}% conv`;
              }}
            />
            {!isSingle && (
              <ReferenceLine
                y={avgVal}
                stroke="#8896a5"
                strokeDasharray="4 3"
                label={{
                  value: avgLabel,
                  position: 'insideTopRight',
                  fill: '#8896a5',
                  fontSize: 11,
                }}
              />
            )}
            <Bar dataKey={metric} name={metricLabel[metric]} radius={[3, 3, 0, 0]}>
              {sorted.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} cursor="pointer" />
              ))}
              <LabelList
                dataKey={metric}
                position="top"
                formatter={(value: unknown) => formatValue(metric, Number(value ?? 0))}
                style={{ fill: '#5f6b7a', fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SpaceBetween>
    </Container>
  );
}