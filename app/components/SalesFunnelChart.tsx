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
import { Container, Header, SpaceBetween, Box } from "@cloudscape-design/components";
import { FunnelStage } from "../lib/metrics";
import { CHART_COLORS } from "./chartTheme";

interface SalesFunnelChartProps {
  funnelData: FunnelStage[];
}

const STAGE_COLORS = [
  CHART_COLORS.revenue,
  "#4da3d9",
  CHART_COLORS.caution,
  "#f2a65a",
  CHART_COLORS.strong,
  "#7bc96f"
];

export default function SalesFunnelChart({ funnelData }: SalesFunnelChartProps) {
  // Find the largest drop in conversion
  let maxDrop = 0;
  let dropIndex = -1;
  let dropPercent = 0;

  for (let i = 1; i < funnelData.length; i++) {
    const current = funnelData[i].count;
    const previous = funnelData[i - 1].count;
    const drop = previous - current;
    if (drop > maxDrop) {
      maxDrop = drop;
      dropIndex = i;
      dropPercent = previous > 0 ? (drop / previous) * 100 : 0;
    }
  }

  const fromStage = dropIndex > 0 ? funnelData[dropIndex - 1]?.stage.replace('_', ' ') : "N/A";
  const toStage = dropIndex >= 0 ? funnelData[dropIndex]?.stage.replace('_', ' ') : "N/A";

  return (
    <Container header={<Header>Sales Funnel</Header>}>
      <SpaceBetween size="m" direction="vertical">
        <Box fontSize="body-s" color="text-body-secondary">
          <strong>Largest drop:</strong> {fromStage} {' -> '} {toStage} ({dropPercent.toFixed(0)}%)
        </Box>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" tickFormatter={(value) => value.replace('_', ' ')} />
            <YAxis />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString()} leads`, "Stage Count"]}
              labelFormatter={(value) => `Stage: ${String(value).replace('_', ' ')}`}
            />
            <Legend />
            <Bar dataKey="count" name="Stage Count" fill={CHART_COLORS.revenue}>
              {funnelData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === dropIndex ? CHART_COLORS.risk : STAGE_COLORS[index % STAGE_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SpaceBetween>
    </Container>
  );
}