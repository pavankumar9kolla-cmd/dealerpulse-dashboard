import {
  Lead,
  Branch,
  SalesRep,
  FilterOptions,
  RevenueTrendData,
  BranchPerformanceData,
  RepPerformanceData,
  LeadAgingData,
  PipelineForecastData,
  Insight
} from './types';

// Re-export types for components
export type {
  Lead,
  Branch,
  SalesRep,
  FilterOptions,
  RevenueTrendData,
  BranchPerformanceData,
  RepPerformanceData,
  LeadAgingData,
  PipelineForecastData,
  Insight
};

// API-based data loading functions
export async function getFilteredLeads(filters: FilterOptions = {}): Promise<Lead[]> {
  const params = new URLSearchParams();

  if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
  if (filters.branchId) params.append('branchId', filters.branchId);
  if (filters.branchIds && filters.branchIds.length > 0) params.append('branchIds', filters.branchIds.join(','));

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

export async function getSalesReps(): Promise<SalesRep[]> {
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

  // Only include branches that have at least one lead in the filtered dataset
  const activeBranchIds = new Set(leads.map(l => l.branch_id));

  return branches
    .filter(branch => activeBranchIds.has(branch.id))
    .map(branch => {
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
      rep_id: rep.id,
      revenue,
      orders,
      conversionRate
    };
  });

  // Filter out reps with no leads at all, then sort by revenue
  const repsWithLeads = repData.filter(rep => rep.revenue > 0 || rep.orders > 0);
  const sortedData = repsWithLeads
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
  
  return sortedData;
}

export async function getLeadAgingData(filters?: FilterOptions): Promise<LeadAgingData[]> {
  const leads = await getFilteredLeads(filters);
  const now = new Date();

  const agingCounts = {
    '0–2 days': 0,
    '3–7 days': 0,
    '8+ days':  0,
  };

  leads.forEach(lead => {
    const created  = new Date(lead.created_at);
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 2) {
      agingCounts['0–2 days']++;
    } else if (daysDiff <= 7) {
      agingCounts['3–7 days']++;
    } else {
      agingCounts['8+ days']++;
    }
  });

  return [
    { range: '0–2 days', count: agingCounts['0–2 days'] },
    { range: '3–7 days', count: agingCounts['3–7 days'] },
    { range: '8+ days',  count: agingCounts['8+ days']  },
  ];
}

export async function getPipelineForecastData(filters?: FilterOptions): Promise<PipelineForecastData[]> {
  const leads = await getFilteredLeads(filters);

  const totalLeads = leads.length;
  const deliveredLeads = leads.filter(lead => lead.status === 'delivered').length;
  const conversionRate = totalLeads > 0 ? deliveredLeads / totalLeads : 0;

  const currentRevenue = leads
    .filter(lead => lead.status === 'delivered')
    .reduce((sum, lead) => sum + lead.deal_value, 0);

  // Pipeline: active leads not yet delivered or lost
  const pipelineValue = leads
    .filter(lead => lead.status !== 'delivered' && lead.status !== 'lost')
    .reduce((sum, lead) => sum + lead.deal_value, 0);

  // Projected Revenue = Current Revenue + (Pipeline Value × Conversion Rate)
  const pipelineRevenue = pipelineValue * conversionRate;
  const projectedRevenue = currentRevenue + pipelineRevenue;

  return [
    { type: 'Current Revenue', value: currentRevenue },
    { type: 'Projected Revenue', value: projectedRevenue, conversionRate, pipelineRevenue }
  ];
}