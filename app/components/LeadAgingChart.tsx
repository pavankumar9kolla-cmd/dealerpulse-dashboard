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
  Legend
} from "recharts";
import { Container, Header } from "@cloudscape-design/components";
import { LeadAgingData } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

interface LeadAgingChartProps {
  data: LeadAgingData[];
}

export default function LeadAgingChart({ data }: LeadAgingChartProps) {
  return (
    <Container header={<Header>Lead Aging Distribution</Header>}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="range" type="category" width={90} />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString()} leads`, "Lead Count"]}
            labelFormatter={(label) => `Aging Range: ${label}`}
          />
          <Legend />
          <Bar dataKey="count" name="Lead Count" fill={CHART_COLORS.caution} />
        </BarChart>
      </ResponsiveContainer>
    </Container>
  );
}