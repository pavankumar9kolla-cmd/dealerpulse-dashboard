'use client';

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";
import { Container, Header, SpaceBetween, Box } from "@cloudscape-design/components";
import { FunnelStage } from "../lib/metrics";
import { CHART_COLORS } from "./chartTheme";

interface SalesFunnelChartProps {
  funnelData: FunnelStage[];
}

const STAGE_ORDER = [
  "new",
  "contacted",
  "test_drive",
  "negotiation",
  "order_placed",
  "delivered"
] as const;

const MUTED_STAGE_COLOR = "#BDBDBD";
const HIGHLIGHT_STAGE_COLOR = "#E15759";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  test_drive: "Test Drive",
  negotiation: "Negotiation",
  order_placed: "Order",
  delivered: "Delivered"
};

function generateInsight(data: { stage: string; stageLabel: string; count: number }[]): string {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return "No pipeline data available for the selected filters.";

  const negotiation = data.find((d) => d.stage === "negotiation");
  const delivered   = data.find((d) => d.stage === "delivered");
  const negCount    = negotiation?.count ?? 0;
  const delCount    = delivered?.count   ?? 0;
  const avgCount    = total / data.filter((d) => d.count > 0).length;

  if (negCount > avgCount * 1.5)
    return `Negotiation is unusually active with ${negCount.toLocaleString()} leads — possible bottleneck or elevated deal-making.`;
  if (negCount === 0)
    return `No leads are currently in Negotiation — review whether deals are progressing past early stages.`;
  if (delCount > 0 && negCount < delCount * 0.5)
    return `${delCount.toLocaleString()} leads have been delivered but only ${negCount.toLocaleString()} are in active Negotiation — pipeline refill may be needed.`;
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top    = sorted[0];
  const topPct = Math.round((top.count / total) * 100);
  return `${top.stageLabel} is the largest stage at ${topPct}% of the pipeline (${top.count.toLocaleString()} leads).`;
}

export default function SalesFunnelChart({ funnelData }: SalesFunnelChartProps) {
  const orderedFunnelData = STAGE_ORDER.map((stage) => {
    const match = funnelData.find((item) => item.stage === stage);
    return {
      stage,
      count: match?.count ?? 0,
      stageLabel: STAGE_LABELS[stage]
    };
  });

  const insight = generateInsight(orderedFunnelData);

  return (
    <Container header={<Header>Sales Pipeline</Header>}>
      <SpaceBetween size="m" direction="vertical">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={orderedFunnelData}
            layout="vertical"
            barCategoryGap="24%"
            margin={{ top: 10, right: 40, left: 0, bottom: 10 }}
          >
            <XAxis type="number" axisLine={false} tickLine={false} domain={[0, 'dataMax + 20']} />
            <YAxis type="category" dataKey="stageLabel" axisLine={false} tickLine={false} width={90} />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString()} leads`, "Lead Count"]}
              labelFormatter={(_label, payload) => `Stage: ${payload?.[0]?.payload?.stageLabel ?? 'N/A'}`}
            />
            <Bar dataKey="count" fill={MUTED_STAGE_COLOR} barSize={34}>
              {orderedFunnelData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.stage === 'negotiation' ? HIGHLIGHT_STAGE_COLOR : MUTED_STAGE_COLOR}
                />
              ))}
              <LabelList dataKey="count" position="right" fill={CHART_COLORS.neutral} fontSize={12} formatter={(value) => Number(value ?? 0).toLocaleString()} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Box fontSize="body-s" color="text-body-secondary">
          <div style={{ minHeight: '2.5rem' }}>{insight}</div>
        </Box>
      </SpaceBetween>
    </Container>
  );
}