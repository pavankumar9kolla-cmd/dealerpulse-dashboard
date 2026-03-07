import DashboardClient, {
  KPIItem,
  FunnelItem,
  BranchItem,
  RepItem,
  Insight
} from "./components/DashboardClient";
import { getLeads, getBranchesSync as getBranches, getSalesRepsSync as getSalesReps } from "./data/dataService";
import {
  calculateKPIs,
  calculateFunnel,
  calculateBranchPerformance,
  calculateRepPerformance
} from "./lib/metrics";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  // retrieve and process data on the server
  const leads = getLeads();
  const branches = getBranches();
  const salesReps = getSalesReps();
  const kpis = calculateKPIs(leads);
  const funnel = calculateFunnel(leads);
  const branchPerf = calculateBranchPerformance(leads, branches);
  const repPerf = calculateRepPerformance(leads, salesReps);

  const kpiItems: KPIItem[] = [
    { metric: "Total Leads", value: kpis.totalLeads.toString() },
    { metric: "Orders Placed", value: kpis.ordersPlaced.toString() },
    { metric: "Delivered Vehicles", value: kpis.deliveredVehicles.toString() },
    { metric: "Total Revenue", value: `$${kpis.totalRevenue.toLocaleString()}` },
    { metric: "Conversion Rate", value: `${kpis.conversionRate.toFixed(1)}%` }
  ];

  const funnelItems: FunnelItem[] = funnel.map((f) => ({
    stage: f.stage.replace(/_/g, " "),
    count: f.count
  }));

  const branchItems: BranchItem[] = branchPerf.map((b) => ({
    branch: b.branch,
    leads: b.leads,
    orders: b.orders,
    revenue: `$${b.revenue.toLocaleString()}`
  }));

  const repItems: RepItem[] = repPerf.map((r) => ({
    rep: r.rep,
    leads: r.leads,
    orders: r.orders,
    revenue: `$${r.revenue.toLocaleString()}`
  }));

  const insights: Insight[] = [
    {
      insight: "Low conversion at negotiation stage",
      recommendation: "Provide reps with negotiation training",
      actions: "Schedule weekly coaching sessions"
    },
    {
      insight: "Uptown branch has highest revenue",
      recommendation: "Investigate successful tactics",
      actions: "Interview branch manager"
    }
  ];

  return (
    <DashboardClient />
  );
}