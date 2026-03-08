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
} from "recharts";
import { Container, Header, Select, SpaceBetween, Box } from "@cloudscape-design/components";
import { RepPerformanceData } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

type Metric = 'revenue' | 'orders' | 'conversionRate';

const TOP_COLOR  = CHART_COLORS.revenue;
const BASE_COLOR = "#d4d9de";

const metricLabel: Record<Metric, string> = {
  revenue:        'Revenue',
  orders:         'Orders',
  conversionRate: 'Conversion Rate',
};

const formatMillions = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

const formatValue = (metric: Metric, value: number, long = false): string => {
  switch (metric) {
    case 'revenue':        return long ? `$${value.toLocaleString()}` : formatMillions(value);
    case 'conversionRate': return `${value.toFixed(1)}%`;
    default:               return String(Math.round(value));
  }
};

const generateTitle = (top: RepPerformanceData | undefined, metric: Metric): string => {
  if (!top) return 'Top Sales Reps';
  switch (metric) {
    case 'revenue':        return `${top.rep} generates the highest revenue among sales representatives.`;
    case 'orders':         return `${top.rep} leads the sales team in total vehicle orders.`;
    case 'conversionRate': return `${top.rep} achieves the highest lead conversion rate.`;
  }
};

interface RepLeaderboardChartProps {
  data: RepPerformanceData[];
  onRepClick?: (repName: string, repId: string) => void;
}

export default function RepLeaderboardChart({ data, onRepClick }: RepLeaderboardChartProps) {
  const [metric, setMetric] = React.useState<Metric>('revenue');

  const sorted = React.useMemo(
    () => [...data].sort((a, b) => (b[metric] as number) - (a[metric] as number)).slice(0, 10),
    [data, metric]
  );

  const hasAnyData = sorted.some(d => (d[metric] as number) > 0);

  if (!data || data.length === 0 || !hasAnyData) {
    return (
      <Container header={<Header>Top Sales Reps</Header>}>
        <Box textAlign="center" padding="l" color="text-body-secondary">
          No sales rep data available for the selected filters. Try selecting a wider date range or different branches.
        </Box>
      </Container>
    );
  }

  const topVal = sorted[0]?.[metric] as number;
  const title  = generateTitle(sorted[0], metric);

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
            layout="vertical"
            margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8eaf0" />
            <XAxis
              type="number"
              tickFormatter={(v) => formatValue(metric, v)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5f6b7a', fontSize: 11 }}
            />
            <YAxis
              dataKey="rep"
              type="category"
              width={130}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5f6b7a', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => {
                if (value == null) return ['N/A', metricLabel[metric]];
                return [formatValue(metric, Number(value), true), metricLabel[metric]];
              }}
              labelFormatter={(label) => `${label}`}
            />
            <Bar
              dataKey={metric}
              name={metricLabel[metric]}
              radius={[0, 3, 3, 0]}
              onClick={(entry: any) => {
                if (onRepClick && entry?.rep && entry?.rep_id) {
                  onRepClick(String(entry.rep), String(entry.rep_id));
                }
              }}
            >
              {sorted.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry[metric] as number) === topVal ? TOP_COLOR : BASE_COLOR}
                  cursor="pointer"
                />
              ))}
              <LabelList
                dataKey={metric}
                position="right"
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