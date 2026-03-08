'use client';

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { Container, Header, SpaceBetween, Box } from "@cloudscape-design/components";
import { LeadAgingData } from "../data/clientDataService";

const BUCKET_COLORS: Record<string, string> = {
  '0\u20132 days': '#2ca02c',  // green  — fresh
  '3\u20137 days': '#ff7f0e',  // orange — needs attention
  '8+ days':      '#d62728',  // red    — high risk
};

const BUCKET_ORDER = ['0\u20132 days', '3\u20137 days', '8+ days'];

const generateTitle = (data: LeadAgingData[]): string => {
  const total    = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return 'No leads match the current filters.';

  const fresh    = data.find(d => d.range === '0\u20132 days')?.count ?? 0;
  const medium   = data.find(d => d.range === '3\u20137 days')?.count ?? 0;
  const old      = data.find(d => d.range === '8+ days')?.count  ?? 0;
  const oldPct   = Math.round((old   / total) * 100);
  const freshPct = Math.round((fresh / total) * 100);

  if (oldPct >= 80)
    return 'Most leads are older than 8 days, indicating delayed follow-up.';
  if (oldPct >= 50)
    return `${oldPct}% of leads are older than 8 days — follow-up urgency is high.`;
  if (freshPct >= 50)
    return 'Most leads are fresh and within the ideal follow-up window.';
  if (medium > fresh && medium > old)
    return 'Most leads are 3–7 days old and need follow-up soon.';
  return 'Lead pipeline aging is balanced across follow-up stages.';
};

const generateInsight = (data: LeadAgingData[]): string => {
  const total  = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return '';
  const old    = data.find(d => d.range === '8+ days')?.count ?? 0;
  const oldPct = Math.round((old / total) * 100);
  if (oldPct >= 80)
    return `Nearly all leads (${oldPct}%) are older than 8 days, suggesting follow-up delays that may reduce conversion rates.`;
  if (oldPct >= 50)
    return `${oldPct}% of leads are past 8 days — prioritise outreach to avoid further pipeline decay.`;
  const fresh    = data.find(d => d.range === '0\u20132 days')?.count ?? 0;
  const freshPct = Math.round((fresh / total) * 100);
  if (freshPct >= 60)
    return `${freshPct}% of leads are within 0–2 days old — the team is receiving and processing leads promptly.`;
  return '';
};

interface LeadAgingChartProps {
  data: LeadAgingData[];
}

export default function LeadAgingChart({ data }: LeadAgingChartProps) {
  // Ensure all buckets are always present in fixed order
  const chartData = BUCKET_ORDER.map(range => ({
    range,
    count: data.find(d => d.range === range)?.count ?? 0,
  }));

  const title   = generateTitle(chartData);
  const insight = generateInsight(chartData);

  return (
    <Container header={<Header variant="h2">{title}</Header>}>
      <SpaceBetween size="m" direction="vertical">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8eaf0" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5f6b7a', fontSize: 12 }}
            />
            <YAxis
              dataKey="range"
              type="category"
              width={90}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#5f6b7a', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString()} leads`, 'Lead Count']}
              labelFormatter={(label) => `Age bucket: ${label}`}
            />
            <Bar dataKey="count" name="Lead Count" radius={[0, 3, 3, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.range} fill={BUCKET_COLORS[entry.range] ?? '#d4d9de'} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v: unknown) => String(Number(v ?? 0).toLocaleString())}
                style={{ fill: '#5f6b7a', fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {insight && (
          <Box fontSize="body-s" color="text-body-secondary">
            <div style={{ minHeight: '2.5rem' }}>{insight}</div>
          </Box>
        )}
        {!insight && <div style={{ minHeight: '2.5rem' }} />}
      </SpaceBetween>
    </Container>
  );
}