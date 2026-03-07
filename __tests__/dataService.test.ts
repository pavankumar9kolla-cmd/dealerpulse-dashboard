import { getLeads, getBranches, getSalesReps } from '../app/data/dataService';

// Mock the file system
jest.mock('fs');
jest.mock('path');

import { readFileSync } from 'fs';
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

const mockData = {
  leads: [
    {
      id: '1',
      customer_name: 'John Doe',
      phone: '555-0101',
      source: 'website',
      model_interested: 'Model S',
      status: 'delivered' as const,
      assigned_to: 'rep_001',
      branch_id: 'branch_001',
      created_at: '2023-01-15T10:00:00Z',
      last_activity_at: '2023-02-20T14:30:00Z',
      status_history: [],
      expected_close_date: '2023-02-15T00:00:00Z',
      deal_value: 75000
    }
  ],
  branches: [
    { id: 'branch_001', name: 'Downtown', city: 'New York' }
  ],
  sales_reps: [
    { id: 'rep_001', name: 'Alice', branch_id: 'branch_001', role: 'Senior Sales Rep', joined: '2022-01-01' }
  ]
};

describe('dataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFileSync.mockReturnValue(JSON.stringify(mockData));
  });

  describe('getLeads', () => {
    it('returns leads from JSON data', async () => {
      const leads = await getLeads();
      expect(leads).toHaveLength(1);
      expect(leads[0]).toHaveProperty('id', '1');
      expect(leads[0]).toHaveProperty('deal_value', 75000);
    });
  });

  describe('getBranches', () => {
    it('returns branches from JSON data', async () => {
      const branches = await getBranches();
      expect(branches).toHaveLength(1);
      expect(branches[0]).toHaveProperty('name', 'Downtown');
    });
  });

  describe('getSalesReps', () => {
    it('returns sales reps from JSON data', async () => {
      const salesReps = await getSalesReps();
      expect(salesReps).toHaveLength(1);
      expect(salesReps[0]).toHaveProperty('name', 'Alice');
    });
  });
});