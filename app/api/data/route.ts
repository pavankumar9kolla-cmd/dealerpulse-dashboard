import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');
    const branchIds = searchParams.get('branchIds');

    // Load data from JSON file
    const filePath = path.join(process.cwd(), 'app', 'data', 'dealership_data.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    let leads = data.leads;

    // Apply filters
    if (startDate || endDate) {
      leads = leads.filter((lead: any) => {
        const leadDate = new Date(lead.created_at);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && leadDate < start) return false;
        if (end && leadDate > end) return false;
        return true;
      });
    }

    if (branchId) {
      leads = leads.filter((lead: any) => lead.branch_id === branchId);
    }

    if (branchIds) {
      const branchIdArray = branchIds.split(',');
      leads = leads.filter((lead: any) => branchIdArray.includes(lead.branch_id));
    }

    return NextResponse.json({
      leads,
      branches: data.branches,
      sales_reps: data.sales_reps
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}