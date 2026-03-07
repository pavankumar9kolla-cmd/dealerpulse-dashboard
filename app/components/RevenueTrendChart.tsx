'use client';

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Container, Header } from "@cloudscape-design/components";
import { RevenueTrendData } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <Container header={<Header>Revenue Trend</Header>}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value) => {
              if (value === undefined || value === null) return ['N/A', 'Revenue'];
              const numValue = Number(value);
              return [`$${numValue.toLocaleString()}`, 'Revenue'];
            }}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={CHART_COLORS.revenue}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.revenue }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Container>
  );
}