import fs from 'fs';
import path from 'path';
import { Lead, Branch, SalesRep, FilterOptions, RevenueTrendData, BranchPerformanceData, RepPerformanceData, LeadAgingData, PipelineForecastData } from './types';

// Server-side data loading functions (for server components)
function loadData() {
  try {
    const dataPath = path.join(process.cwd(), 'app', 'data', 'dealership_data.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to load dealership_data.json:', error);
    return { leads: [], branches: [], sales_reps: [] };
  }
}

export function getLeads(): Lead[] {
  const data = loadData();
  return data.leads || [];
}

export function getBranchesSync(): Branch[] {
  const data = loadData();
  return data.branches || [];
}

export function getSalesRepsSync(): SalesRep[] {
  const data = loadData();
  return data.sales_reps || [];
}

// API-based data loading functions
export async function getFilteredLeads(filters: FilterOptions = {}): Promise<Lead[]> {
  const params = new URLSearchParams();

  if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
  if (filters.branchId) params.append('branchId', filters.branchId);

  const response = await fetch(`/api/data?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch leads data');
  }

  const data = await response.json();
  return data.leads;
}

export async function getBranches(): Promise<Branch[]> {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error('Failed to fetch branches data');
  }

  const data = await response.json();
  return data.branches;
}

export async function getSalesReps(): Promise<any[]> {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error('Failed to fetch sales reps data');
  }

  const data = await response.json();
  return data.sales_reps;
}

export async function getRevenueTrendData(filters?: FilterOptions): Promise<RevenueTrendData[]> {
  const leads = await getFilteredLeads(filters);
  const deliveredLeads = leads.filter(lead => lead.status === 'delivered');

  // Group by month
  const monthlyRevenue: { [key: string]: number } = {};
  deliveredLeads.forEach(lead => {
    const date = new Date(lead.last_activity_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + lead.deal_value;
  });

  return Object.entries(monthlyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

export async function getBranchPerformanceData(filters?: FilterOptions): Promise<BranchPerformanceData[]> {
  const leads = await getFilteredLeads(filters);
  const branches = await getBranches();

  return branches.map(branch => {
    const branchLeads = leads.filter(lead => lead.branch_id === branch.id);
    const orders = branchLeads.filter(lead => lead.status === 'order_placed' || lead.status === 'delivered').length;
    const revenue = branchLeads
      .filter(lead => lead.status === 'delivered')
      .reduce((sum, lead) => sum + lead.deal_value, 0);
    const conversionRate = branchLeads.length > 0 ? (orders / branchLeads.length) * 100 : 0;

    return {
      branch: branch.name,
      revenue,
      orders,
      conversionRate
    };
  });
}

export async function getRepPerformanceData(filters?: FilterOptions, limit: number = 10): Promise<RepPerformanceData[]> {
  const leads = await getFilteredLeads(filters);
  const reps = await getSalesReps();

  const repData = reps.map(rep => {
    const repLeads = leads.filter(lead => lead.assigned_to === rep.id);
    const orders = repLeads.filter(lead => lead.status === 'order_placed' || lead.status === 'delivered').length;
    const revenue = repLeads
      .filter(lead => lead.status === 'delivered')
      .reduce((sum, lead) => sum + lead.deal_value, 0);
    const conversionRate = repLeads.length > 0 ? (orders / repLeads.length) * 100 : 0;

    return {
      rep: rep.name,
      revenue,
      orders,
      conversionRate
    };
  });

  return repData
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getLeadAgingData(filters?: FilterOptions): Promise<LeadAgingData[]> {
  const leads = await getFilteredLeads(filters);
  const now = new Date();

  const agingCounts = {
    '0-2 days': 0,
    '3-5 days': 0,
    '6+ days': 0
  };

  leads.forEach(lead => {
    const lastActivity = new Date(lead.last_activity_at);
    const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 2) {
      agingCounts['0-2 days']++;
    } else if (daysDiff <= 5) {
      agingCounts['3-5 days']++;
    } else {
      agingCounts['6+ days']++;
    }
  });

  return Object.entries(agingCounts).map(([range, count]) => ({ range, count }));
}

export async function getPipelineForecastData(filters?: FilterOptions): Promise<PipelineForecastData[]> {
  const leads = await getFilteredLeads(filters);

  const currentRevenue = leads
    .filter(lead => lead.status === 'delivered')
    .reduce((sum, lead) => sum + lead.deal_value, 0);

  // Simple forecast: assume 70% of pipeline converts
  const pipelineValue = leads
    .filter(lead => lead.status !== 'delivered' && lead.status !== 'lost')
    .reduce((sum, lead) => sum + lead.deal_value, 0);

  const projectedRevenue = currentRevenue + (pipelineValue * 0.7);

  return [
    { type: 'Current Revenue', value: currentRevenue },
    { type: 'Projected Revenue', value: projectedRevenue }
  ];
}
