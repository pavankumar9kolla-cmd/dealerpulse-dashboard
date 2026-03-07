import {
  calculateKPIs,
  calculateFunnel,
  calculateBranchPerformance,
  calculateRepPerformance,
  type Lead
} from '../app/lib/metrics';
import { type Branch, type SalesRep } from '../app/data/dataService';

const mockLeads: Lead[] = [
  {
    id: '1',
    customer_name: 'John Doe',
    phone: '555-0101',
    source: 'website',
    model_interested: 'Model S',
    status: 'new',
    assigned_to: 'rep_001',
    branch_id: 'branch_001',
    created_at: '2023-01-15T10:00:00Z',
    last_activity_at: '2023-01-15T10:00:00Z',
    status_history: [],
    expected_close_date: '2023-02-15T00:00:00Z',
    deal_value: 0
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    phone: '555-0102',
    source: 'phone',
    model_interested: 'Model 3',
    status: 'contacted',
    assigned_to: 'rep_002',
    branch_id: 'branch_001',
    created_at: '2023-01-20T11:00:00Z',
    last_activity_at: '2023-01-20T11:00:00Z',
    status_history: [],
    expected_close_date: '2023-02-20T00:00:00Z',
    deal_value: 0
  },
  {
    id: '3',
    customer_name: 'Bob Johnson',
    phone: '555-0103',
    source: 'walk-in',
    model_interested: 'Model X',
    status: 'order_placed',
    assigned_to: 'rep_001',
    branch_id: 'branch_002',
    created_at: '2023-02-01T09:00:00Z',
    last_activity_at: '2023-02-01T09:00:00Z',
    status_history: [],
    expected_close_date: '2023-02-15T00:00:00Z',
    deal_value: 30000
  },
  {
    id: '4',
    customer_name: 'Alice Brown',
    phone: '555-0104',
    source: 'website',
    model_interested: 'Model Y',
    status: 'delivered',
    assigned_to: 'rep_002',
    branch_id: 'branch_002',
    created_at: '2023-02-05T12:00:00Z',
    last_activity_at: '2023-02-05T12:00:00Z',
    status_history: [],
    expected_close_date: '2023-02-10T00:00:00Z',
    deal_value: 45000
  },
];

const mockBranches: Branch[] = [
  { id: 'branch_001', name: 'Downtown', city: 'New York' },
  { id: 'branch_002', name: 'Uptown', city: 'New York' }
];

const mockSalesReps: SalesRep[] = [
  { id: 'rep_001', name: 'Alice', branch_id: 'branch_001', role: 'Senior Sales Rep', joined: '2022-01-01' },
  { id: 'rep_002', name: 'Bob', branch_id: 'branch_002', role: 'Sales Rep', joined: '2022-06-01' }
];

describe('metrics', () => {
  describe('calculateKPIs', () => {
    it('calculates KPIs correctly', () => {
      const kpis = calculateKPIs(mockLeads);
      expect(kpis.totalLeads).toBe(4);
      expect(kpis.ordersPlaced).toBe(2);
      expect(kpis.deliveredVehicles).toBe(1);
      expect(kpis.totalRevenue).toBe(75000);
      expect(kpis.conversionRate).toBe(50);
    });
  });

  describe('calculateFunnel', () => {
    it('calculates funnel stages', () => {
      const funnel = calculateFunnel(mockLeads);
      expect(funnel).toHaveLength(6);
      expect(funnel.find(f => f.stage === 'new')?.count).toBe(1);
      expect(funnel.find(f => f.stage === 'contacted')?.count).toBe(1);
      expect(funnel.find(f => f.stage === 'order_placed')?.count).toBe(1);
      expect(funnel.find(f => f.stage === 'delivered')?.count).toBe(1);
    });
  });

  describe('calculateBranchPerformance', () => {
    it('calculates branch performance', () => {
      const branchPerf = calculateBranchPerformance(mockLeads, mockBranches);
      expect(branchPerf).toHaveLength(2);
      const downtown = branchPerf.find(b => b.branch === 'Downtown');
      expect(downtown?.leads).toBe(2);
      expect(downtown?.orders).toBe(0);
      expect(downtown?.revenue).toBe(0);
      const uptown = branchPerf.find(b => b.branch === 'Uptown');
      expect(uptown?.leads).toBe(2);
      expect(uptown?.orders).toBe(2);
      expect(uptown?.revenue).toBe(75000);
    });
  });

  describe('calculateRepPerformance', () => {
    it('calculates rep performance', () => {
      const repPerf = calculateRepPerformance(mockLeads, mockSalesReps);
      expect(repPerf).toHaveLength(2);
      const alice = repPerf.find(r => r.rep === 'Alice');
      expect(alice?.leads).toBe(2);
      expect(alice?.orders).toBe(1);
      expect(alice?.revenue).toBe(30000);
      const bob = repPerf.find(r => r.rep === 'Bob');
      expect(bob?.leads).toBe(2);
      expect(bob?.orders).toBe(1);
      expect(bob?.revenue).toBe(45000);
    });
  });
});