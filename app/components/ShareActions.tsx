'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@cloudscape-design/components';
import { FilterOptions, Insight } from '../data/clientDataService';
import { KPIs } from '../lib/metrics';

interface ShareActionsProps {
  filters: FilterOptions;
  kpis: KPIs | null;
  insights: Insight[];
}

function buildShareUrl(filters: FilterOptions): string {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.set('endDate', filters.endDate.toISOString());
  if (filters.branchIds && filters.branchIds.length > 0) params.set('branchIds', filters.branchIds.join(','));

  const query = params.toString();
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
}

export default function ShareActions({ filters, kpis, insights }: ShareActionsProps) {
  const [toast, setToast] = useState('');

  const shareUrl = useMemo(() => buildShareUrl(filters), [filters]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const copyShareLink = async () => {
    try {
      if (!shareUrl) return;
      await navigator.clipboard.writeText(shareUrl);
      flash('Link copied');
    } catch {
      flash('Copy failed — use browser address bar');
    }
  };

  const copySummary = async () => {
    const summary = [
      `Revenue: $${kpis?.totalRevenue.toLocaleString() ?? 0}`,
      `Conversion Rate: ${kpis?.conversionRate.toFixed(1) ?? '0.0'}%`,
      `Delivered Vehicles: ${kpis?.deliveredVehicles ?? 0}`,
      ...insights.slice(0, 3).map((insight, idx) => `Insight ${idx + 1}: ${insight.insight}`)
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      flash('Summary copied');
    } catch {
      flash('Unable to copy summary');
    }
  };

  const printDashboard = () => window.print();

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "24px",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        padding: "6px 10px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }}
    >
      {toast && (
        <span style={{ fontSize: "12px", color: "#0972d3", marginRight: "6px", whiteSpace: "nowrap" }}>
          {toast}
        </span>
      )}
      <div title="Copy share link">
        <Button
          variant="icon"
          iconName="share"
          ariaLabel="Copy share link"
          onClick={copyShareLink}
        />
      </div>
      <div title="Copy executive summary">
        <Button
          variant="icon"
          iconName="copy"
          ariaLabel="Copy executive summary"
          onClick={copySummary}
        />
      </div>
      <div title="Export PDF (Print)">
        <Button
          variant="icon"
          iconName="download"
          ariaLabel="Export PDF (Print)"
          onClick={printDashboard}
        />
      </div>
    </div>
  );
}
