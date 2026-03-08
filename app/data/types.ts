export interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  source: string;
  model_interested: string;
  status: 'new' | 'contacted' | 'test_drive' | 'negotiation' | 'order_placed' | 'delivered' | 'lost';
  assigned_to: string;
  branch_id: string;
  created_at: string;
  last_activity_at: string;
  status_history: Array<any>;
  expected_close_date: string;
  deal_value: number;
  lost_reason?: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export interface SalesRep {
  id: string;
  name: string;
  branch_id: string;
  role: string;
  joined: string;
}

export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  branchIds?: string[];
}

export interface RevenueTrendData {
  date: string;
  revenue: number;
}

export interface BranchPerformanceData {
  branch: string;
  revenue: number;
  orders: number;
  conversionRate: number;
}

export interface RepPerformanceData {
  rep: string;
  rep_id: string;
  revenue: number;
  orders: number;
  conversionRate: number;
}

export interface LeadAgingData {
  range: string;
  count: number;
}

export interface PipelineForecastData {
  type: string;
  value: number;
  conversionRate?: number;
  pipelineRevenue?: number;
}

export interface Insight {
  insight: string;
  recommendation: string;
  actions: string;
}