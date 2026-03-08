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
  LabelList,
  Cell,
} from "recharts";
import { Container, Header, Box, SpaceBetween } from "@cloudscape-design/components";
import { PipelineForecastData } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

interface PipelineForecastChartProps {
  data: PipelineForecastData[];
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function generateTitle(currentRevenue: number, projectedRevenue: number): string {
  if (currentRevenue === 0 && projectedRevenue === 0) return "Revenue Forecast";
  if (projectedRevenue > currentRevenue) {
    return "Current pipeline suggests potential revenue growth if conversion rates hold.";
  }
  if (projectedRevenue === currentRevenue) {
    return "Pipeline activity is not expected to add significant revenue.";
  }
  return "Current pipeline indicates limited additional revenue upside.";
}

export default function PipelineForecastChart({ data }: PipelineForecastChartProps) {
  const currentEntry = data.find((d) => d.type === "Current Revenue");
  const projectedEntry = data.find((d) => d.type === "Projected Revenue");
  const currentRevenue = currentEntry?.value ?? 0;
  const projectedRevenue = projectedEntry?.value ?? 0;
  const conversionRate = projectedEntry?.conversionRate ?? null;
  const pipelineRevenue = projectedEntry?.pipelineRevenue ?? null;

  const chartData = [
    { label: "Current Revenue", value: currentRevenue },
    { label: "Projected Revenue", value: projectedRevenue },
  ];

  const title = generateTitle(currentRevenue, projectedRevenue);

  const insightText =
    conversionRate !== null && pipelineRevenue !== null
      ? `If current pipeline converts at the historical rate (${(conversionRate * 100).toFixed(0)}%), revenue could reach approximately ${formatValue(projectedRevenue)}, adding ${formatValue(pipelineRevenue)} from active leads.`
      : `Projected revenue is estimated at ${formatValue(projectedRevenue)} based on active pipeline activity.`;

  const barColors = ["#b8c4ce", CHART_COLORS.revenue];

  return (
    <Container header={<Header>{title}</Header>}>
      <SpaceBetween size="s">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 24, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => formatValue(v)}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: unknown) => [formatValue(Number(value)), "Revenue"]}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={80}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={barColors[index]} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value: unknown) => formatValue(Number(value))}
                style={{ fontSize: 13, fontWeight: 600, fill: "#16191f" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ minHeight: "2.5rem" }}>
          <Box color="text-body-secondary" fontSize="body-s">
            {insightText}
          </Box>
        </div>
      </SpaceBetween>
    </Container>
  );
}