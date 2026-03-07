import { Lead, Branch, SalesRep, FilterOptions } from "../data/types";

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
