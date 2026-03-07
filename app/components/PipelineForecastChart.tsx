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
import { Container, Header } from "@cloudscape-design/components";
import { PipelineForecastData } from "../data/clientDataService";
import { CHART_COLORS } from "./chartTheme";

interface PipelineForecastChartProps {
  data: PipelineForecastData[];
}

export default function PipelineForecastChart({ data }: PipelineForecastChartProps) {
  const currentRevenue = data.find((d) => d.type === "Current Revenue")?.value ?? 0;
  const projectedRevenue = data.find((d) => d.type === "Projected Revenue")?.value ?? 0;
  const comparisonData = [
    {
      category: "Revenue",
      currentRevenue,
      projectedRevenue
    }
  ];

  return (
    <Container header={<Header>Revenue Forecast</Header>}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip
            formatter={(value) => {
              if (value === undefined || value === null) return ['N/A', 'Amount'];
              const numValue = Number(value);
              return [`$${numValue.toLocaleString()}`, 'Revenue'];
            }}
            labelFormatter={() => "Forecast assumption: 70% pipeline conversion"}
          />
          <Legend />
          <Bar dataKey="currentRevenue" name="Current Revenue" fill={CHART_COLORS.revenue} />
          <Bar dataKey="projectedRevenue" name="Projected Revenue" fill={CHART_COLORS.forecast} />
        </BarChart>
      </ResponsiveContainer>
    </Container>
  );
}