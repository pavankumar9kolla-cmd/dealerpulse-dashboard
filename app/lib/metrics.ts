import { Lead, Branch, SalesRep, FilterOptions } from "../data/types";
import { BranchPerformanceData, Insight } from "../data/types";

export interface KPIs {
  totalLeads: number;
  ordersPlaced: number;
  deliveredVehicles: number;
  totalRevenue: number;
  conversionRate: number; // percentage value 0-100
  pipelineValue: number; // value of leads in pipeline
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface BranchPerformance {
  branch: string;
  leads: number;
  orders: number;
  revenue: number;
}

export interface RepPerformance {
  rep: string;
  leads: number;
  orders: number;
  revenue: number;
}

export function calculateKPIs(leads: Lead[]): KPIs {
  const totalLeads = leads.length;
  const ordersPlaced = leads.filter(
    (l) => l.status === "order_placed" || l.status === "delivered"
  ).length;
  const deliveredVehicles = leads.filter((l) => l.status === "delivered").length;
  const totalRevenue = leads
    .filter((l) => l.status === "delivered")
    .reduce((sum, l) => sum + l.deal_value, 0);
  const pipelineValue = leads
    .filter((l) => l.status !== "delivered" && l.status !== "lost")
    .reduce((sum, l) => sum + l.deal_value, 0);
  const conversionRate = totalLeads > 0 ? (ordersPlaced / totalLeads) * 100 : 0;
  return {
    totalLeads,
    ordersPlaced,
    deliveredVehicles,
    totalRevenue,
    conversionRate,
    pipelineValue,
  };
}

export function calculateFunnel(leads: Lead[]): FunnelStage[] {
  const stages: FunnelStage["stage"][] = [
    "new",
    "contacted",
    "test_drive",
    "negotiation",
    "order_placed",
    "delivered",
  ];
  return stages.map((stage) => ({
    stage,
    count: leads.filter((l) => l.status === stage).length,
  }));
}

export function calculateBranchPerformance(
  leads: Lead[],
  branches: Branch[]
): BranchPerformance[] {
  const branchMap = new Map(branches.map(b => [b.id, b.name]));
  const map = new Map<string, BranchPerformance>();
  leads.forEach((l) => {
    const branchName = branchMap.get(l.branch_id) || l.branch_id;
    const entry = map.get(branchName);
    if (entry) {
      entry.leads += 1;
      if (l.status === "order_placed" || l.status === "delivered") {
        entry.orders += 1;
      }
      entry.revenue += l.deal_value;
    } else {
      map.set(branchName, {
        branch: branchName,
        leads: 1,
        orders:
          l.status === "order_placed" || l.status === "delivered" ? 1 : 0,
        revenue: l.deal_value,
      });
    }
  });
  return Array.from(map.values());
}

export function calculateRepPerformance(leads: Lead[], salesReps: SalesRep[]): RepPerformance[] {
  const repMap = new Map(salesReps.map(r => [r.id, r.name]));
  const map = new Map<string, RepPerformance>();
  leads.forEach((l) => {
    const repName = repMap.get(l.assigned_to) || l.assigned_to;
    const entry = map.get(repName);
    if (entry) {
      entry.leads += 1;
      if (l.status === "order_placed" || l.status === "delivered") {
        entry.orders += 1;
      }
      entry.revenue += l.deal_value;
    } else {
      map.set(repName, {
        rep: repName,
        leads: 1,
        orders:
          l.status === "order_placed" || l.status === "delivered" ? 1 : 0,
        revenue: l.deal_value,
      });
    }
  });
  return Array.from(map.values());
}

export function generateBranchInsights(
  branches: BranchPerformanceData[],
  leads: Lead[]
): Insight[] {
  if (branches.length < 2) return [];

  const insights: Insight[] = [];

  const avgRevenue = branches.reduce((s, b) => s + b.revenue, 0) / branches.length;
  const avgConversion = branches.reduce((s, b) => s + b.conversionRate, 0) / branches.length;

  const sortedByRevenue = [...branches].sort((a, b) => b.revenue - a.revenue);
  const top = sortedByRevenue[0];
  const bottom = sortedByRevenue[sortedByRevenue.length - 1];

  // 1. Top revenue performer
  if (avgRevenue > 0) {
    const aboveAvgPct = Math.round(((top.revenue - avgRevenue) / avgRevenue) * 100);
    insights.push({
      insight: `🏆 ${top.branch} leads the network`,
      recommendation: `${top.branch} generated $${top.revenue.toLocaleString()} in revenue — ${aboveAvgPct}% above the network average of $${Math.round(avgRevenue).toLocaleString()}.`,
      actions: `Document and share ${top.branch}'s sales strategies. Consider scheduling a knowledge-sharing session across the network.`,
    });
  }

  // 2. Underperforming branch by conversion rate
  const lowestConv = [...branches].sort((a, b) => a.conversionRate - b.conversionRate)[0];
  if (avgConversion > 0 && lowestConv.conversionRate < avgConversion * 0.75) {
    const gapPct = Math.round(avgConversion - lowestConv.conversionRate);
    insights.push({
      insight: `⚠️ ${lowestConv.branch} conversion rate needs attention`,
      recommendation: `${lowestConv.branch} has a ${lowestConv.conversionRate.toFixed(1)}% conversion rate — ${gapPct}pp below the network average of ${avgConversion.toFixed(1)}%.`,
      actions: `Review lead qualification and follow-up cadence at ${lowestConv.branch}. Assign a senior sales coach for targeted support.`,
    });
  }

  // 3. Revenue gap between top and bottom (if meaningful spread)
  if (branches.length >= 3 && bottom.revenue < avgRevenue * 0.6) {
    const gapMultiple = bottom.revenue > 0 ? (top.revenue / bottom.revenue).toFixed(1) : "N/A";
    insights.push({
      insight: `⚠️ Revenue gap: ${top.branch} vs ${bottom.branch}`,
      recommendation: `${top.branch} generates ${gapMultiple}× more revenue than ${bottom.branch} ($${top.revenue.toLocaleString()} vs $${bottom.revenue.toLocaleString()}).`,
      actions: `Investigate operational differences between these locations. Consider reallocating marketing budget toward higher-potential markets.`,
    });
  }

  // 4. Branch with highest orders (near-term growth signal), only if different from revenue leader
  const topByOrders = [...branches].sort((a, b) => b.orders - a.orders)[0];
  if (topByOrders && topByOrders.branch !== top.branch) {
    insights.push({
      insight: `📈 ${topByOrders.branch} shows strong near-term growth`,
      recommendation: `${topByOrders.branch} has ${topByOrders.orders} orders placed — the highest across the network — indicating strong near-term revenue potential.`,
      actions: `Ensure delivery capacity and inventory availability at ${topByOrders.branch} to convert this pipeline into delivered revenue.`,
    });
  }

  return insights.slice(0, 3);
}
