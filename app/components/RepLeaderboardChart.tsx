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
  Legend
} from "recharts";
import { Container, Header, Select, SpaceBetween, Box } from "@cloudscape-design/components";
import { RepPerformanceData } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

interface RepLeaderboardChartProps {
  data: RepPerformanceData[];
}

export default function RepLeaderboardChart({ data }: RepLeaderboardChartProps) {
  const [metric, setMetric] = React.useState<'revenue' | 'orders' | 'conversionRate'>('revenue');

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue': return 'Revenue';
      case 'orders': return 'Orders';
      case 'conversionRate': return 'Conversion Rate';
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

  // Sort data by selected metric
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[metric];
    const bValue = b[metric];
    return bValue - aValue;
  });

  // Check if all data is zero
  const top10Data = sortedData.slice(0, 10);
  const hasAnyData = top10Data.some(item => item[metric] > 0);

  if (!data || data.length === 0 || !hasAnyData) {
    return (
      <Container header={<Header>Top Sales Reps</Header>}>
        <Box textAlign="center" padding="l" color="text-body-secondary">
          No sales rep data available for the selected filters. Try selecting a wider date range or different branches.
        </Box>
      </Container>
    );
  }

  return (
    <Container header={<Header>Top Sales Reps</Header>}>
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
            data={top10Data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="rep" type="category" width={120} />
            <Tooltip
              formatter={(value) => {
                if (value === undefined || value === null) return ['N/A', getMetricLabel()];
                const numValue = Number(value);
                return [formatTooltip(numValue), getMetricLabel()];
              }}
              labelFormatter={(label) => `Sales Rep: ${label}`}
            />
            <Legend />
            <Bar
              dataKey={getDataKey()}
              name={getMetricLabel()}
              fill={metric === 'revenue' ? CHART_COLORS.revenue : metric === 'orders' ? CHART_COLORS.caution : CHART_COLORS.strong}
            />
          </BarChart>
        </ResponsiveContainer>
      </SpaceBetween>
    </Container>
  );
}