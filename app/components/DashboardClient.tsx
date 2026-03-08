'use client';

import React, { useState, useEffect } from "react";
import {
  AppLayout,
  SideNavigation,
  ContentLayout,
  Header,
  SpaceBetween,
  Container,
  ColumnLayout,
  Alert,
  Box,
  Badge,
  Grid,
  Modal,
  Button,
  TextContent,
  Table
} from "@cloudscape-design/components";
import FiltersComponent from "./FiltersComponent";
import SalesFunnelChart from "./SalesFunnelChart";
import RevenueTrendChart from "./RevenueTrendChart";
import BranchPerformanceChart from "./BranchPerformanceChart";
import RepLeaderboardChart from "./RepLeaderboardChart";
import LeadAgingChart from "./LeadAgingChart";
import PipelineForecastChart from "./PipelineForecastChart";
import ExportControls from "./ExportControls";
import WhatIfScenarioPanel from "./WhatIfScenarioPanel";
import ShareActions from "./ShareActions";
import {
  getFilteredLeads,
  getBranches,
  getSalesReps,
  getRevenueTrendData,
  getBranchPerformanceData,
  getRepPerformanceData,
  getLeadAgingData,
  getPipelineForecastData,
  FilterOptions,
  Branch,
  RevenueTrendData,
  BranchPerformanceData,
  RepPerformanceData,
  LeadAgingData,
  PipelineForecastData,
  Insight,
  Lead
} from "../data/clientDataService";

// Re-export types for page.tsx
export type { Insight };
import { calculateKPIs, KPIs, FunnelStage, generateBranchInsights } from "../lib/metrics";

export interface KPIItem {
  metric: string;
  value: string;
}

export interface FunnelItem {
  stage: string;
  count: number;
}

export interface BranchItem {
  branch: string;
  leads: number;
  orders: number;
  revenue: string;
}

export interface RepItem {
  rep: string;
  leads: number;
  orders: number;
  revenue: string;
}

interface AnomalyAlert {
  title: string;
  detail: string;
  severity: 'warning' | 'error' | 'info';
}

interface ExecutiveSummaryData {
  headline: string;
  bullets: string[];
}

function generateKeyInsight(params: {
  revenueData: { revenue: number }[];
  funnelData: { stage: string; count: number }[];
  leads: Lead[];
  branchData: { branch: string; revenue: number }[];
  filters: FilterOptions;
}): string | null {
  const { revenueData, funnelData, leads, branchData, filters } = params;
  const toTitle = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const selectedBranchIds = filters.branchIds ?? (filters.branchId ? [filters.branchId] : []);
  const isSingleBranch = selectedBranchIds.length === 1;
  const singleBranchName = isSingleBranch && branchData.length > 0 ? branchData[0].branch : null;

  const positiveSignals: string[] = [];
  const negativeSignals: string[] = [];

  // 1. Revenue trend
  if (revenueData.length >= 2) {
    const latest = revenueData[revenueData.length - 1].revenue;
    const previous = revenueData[revenueData.length - 2].revenue;
    if (previous > 0) {
      const pct = ((latest - previous) / previous) * 100;
      if (isSingleBranch && singleBranchName) {
        if (pct > 20) positiveSignals.push(`${singleBranchName} revenue grew +${pct.toFixed(0)}% vs prior period`);
        else if (pct < -20) negativeSignals.push(`${singleBranchName} revenue declined ${Math.abs(pct).toFixed(0)}% vs prior period`);
      } else {
        if (pct > 20) positiveSignals.push(`Revenue is growing strongly (+${pct.toFixed(0)}% vs prior period)`);
        else if (pct < -20) negativeSignals.push(`Revenue declined ${Math.abs(pct).toFixed(0)}% vs prior period`);
      }
    }
  }

  // 2. Pipeline drop-off (largest stage-to-stage drop)
  if (funnelData.length > 1) {
    let largestDrop = 0;
    let fromLabel = '';
    let toLabel = '';
    for (let i = 0; i < funnelData.length - 1; i++) {
      const cur = funnelData[i].count;
      const nxt = funnelData[i + 1].count;
      const drop = cur > 0 ? ((cur - nxt) / cur) * 100 : 0;
      if (drop > largestDrop) {
        largestDrop = drop;
        fromLabel = toTitle(funnelData[i].stage);
        toLabel = toTitle(funnelData[i + 1].stage);
      }
    }
    if (largestDrop > 50) {
      const dropMsg = isSingleBranch && singleBranchName
        ? `pipeline conversion from ${fromLabel} \u2192 ${toLabel} remains weak (${largestDrop.toFixed(0)}% drop-off)`
        : `${largestDrop.toFixed(0)}% of leads drop between ${fromLabel} \u2192 ${toLabel}`;
      negativeSignals.push(dropMsg);
    }
  }

  // 3. Lead aging risk (from filtered leads only)
  const activeLeads = leads.filter(l => l.status !== 'delivered' && l.status !== 'lost');
  if (activeLeads.length > 0) {
    const now = new Date().getTime();
    const oldCount = activeLeads.filter(l => (now - new Date(l.created_at).getTime()) / 86400000 > 8).length;
    const oldPct = (oldCount / activeLeads.length) * 100;
    if (oldPct > 50) negativeSignals.push('most active leads are older than 8 days and may require follow-up');
  }

  // 4. Branch comparison — only when multiple branches are in filteredData
  if (!isSingleBranch && branchData.length >= 2) {
    const mean = branchData.reduce((s, b) => s + b.revenue, 0) / branchData.length;
    const worst = [...branchData].sort((a, b) => a.revenue - b.revenue)[0];
    if (mean > 0 && worst.revenue < mean * 0.7) {
      negativeSignals.push(`${worst.branch} is underperforming vs the network average`);
    }
  }

  if (positiveSignals.length === 0 && negativeSignals.length === 0) return null;

  const parts: string[] = [];
  if (positiveSignals.length > 0) parts.push(positiveSignals.join(' and '));
  if (negativeSignals.length > 0) {
    if (isSingleBranch) {
      // For single branch: join signals naturally
      if (positiveSignals.length > 0) {
        parts.push('but ' + negativeSignals.join(' and '));
      } else {
        const first = negativeSignals[0];
        parts.push(first.charAt(0).toUpperCase() + first.slice(1));
        if (negativeSignals.length > 1) parts.push(...negativeSignals.slice(1));
      }
    } else {
      const negText = 'pipeline health is weak: ' + negativeSignals.join(' and ');
      if (positiveSignals.length > 0) {
        parts.push('but ' + negText);
      } else {
        parts.push(negText.charAt(0).toUpperCase() + negText.slice(1));
      }
    }
  }

  return parts.join(', ') + '.';
}

export default function DashboardClient() {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [kpiItems, setKpiItems] = useState<KPIItem[]>([]);
  const [funnelItems, setFunnelItems] = useState<FunnelItem[]>([]);
  const [branches, setBranches] = useState<{ label: string; value: string }[]>([]);
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendData[]>([]);
  const [branchPerformanceData, setBranchPerformanceData] = useState<BranchPerformanceData[]>([]);
  const [repPerformanceData, setRepPerformanceData] = useState<RepPerformanceData[]>([]);
  const [leadAgingData, setLeadAgingData] = useState<LeadAgingData[]>([]);
  const [pipelineForecastData, setPipelineForecastData] = useState<PipelineForecastData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [branchInsights, setBranchInsights] = useState<Insight[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [keyInsight, setKeyInsight] = useState<string | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummaryData | null>(null);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  
  // Drill-down state
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [branchDetailData, setBranchDetailData] = useState<any>(null);
  const [repDetailData, setRepDetailData] = useState<any>(null);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  const loadData = async () => {
    try {
      // Load branches for filter dropdown
      const [branchesData, salesReps] = await Promise.all([getBranches(), getSalesReps()]);
      setBranches(branchesData.map(b => ({ label: b.name, value: b.id })));

      // Load filtered data
      const leads = await getFilteredLeads(filters);
      setFilteredLeads(leads);

      // Calculate KPIs
      const kpis = calculateKPIs(leads);
      setKpis(kpis);
      setKpiItems([
        { metric: "Total Leads", value: kpis.totalLeads.toString() },
        { metric: "Total Sales Reps", value: `${salesReps.length}` },
        { metric: "Orders Placed", value: kpis.ordersPlaced.toString() },
        { metric: "Delivered Vehicles", value: kpis.deliveredVehicles.toString() },
        { metric: "Total Revenue", value: `$${kpis.totalRevenue.toLocaleString()}` },
        { metric: "Conversion Rate", value: `${kpis.conversionRate.toFixed(1)}%` },
        { metric: "Pipeline Value", value: `$${kpis.pipelineValue.toLocaleString()}` }
      ]);

      // Calculate funnel data
      const funnelStages: Array<'new' | 'contacted' | 'test_drive' | 'negotiation' | 'order_placed' | 'delivered'> = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed', 'delivered'];
      const funnelData = funnelStages.map(stage => ({
        stage,
        count: leads.filter(lead => lead.status === stage).length
      }));
      setFunnelItems(funnelData);

      // Load chart data
      const [revenueData, branchData, repData, allRepData, agingData, forecastData] = await Promise.all([
        getRevenueTrendData(filters),
        getBranchPerformanceData(filters),
        getRepPerformanceData(filters),
        getRepPerformanceData(filters, 1000),
        getLeadAgingData(filters),
        getPipelineForecastData(filters)
      ]);

      setRevenueTrendData(revenueData);
      setBranchPerformanceData(branchData);
      setRepPerformanceData(repData);
      setLeadAgingData(agingData);
      setPipelineForecastData(forecastData);

      // Generate dynamic insights
      const newInsights: Insight[] = [];
      const anomalyAlerts: AnomalyAlert[] = [];

      // 1. Conversion Rate Analysis
      const totalLeads = leads.length;
      const convertedLeads = leads.filter(l => l.status === 'delivered').length;
      const overallConversion = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      
      if (overallConversion < 20 && totalLeads > 20) {
        newInsights.push({
          insight: "⚠️ Low Conversion Rate Alert",
          recommendation: `Current conversion rate is ${overallConversion.toFixed(1)}%. Healthy range is 20-40%.`,
          actions: "Implement targeted lead nurturing campaigns and improve sales follow-up processes."
        });
      } else if (overallConversion > 40) {
        newInsights.push({
          insight: "✅ Excellent Conversion Performance",
          recommendation: `${overallConversion.toFixed(1)}% conversion rate exceeds healthy range of 20-40%.`,
          actions: "Document successful strategies and share best practices across teams."
        });
      }

      // 2. Pipeline Stage Analysis
      const stageDistribution = {
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        test_drive: leads.filter(l => l.status === 'test_drive').length,
        negotiation: leads.filter(l => l.status === 'negotiation').length,
        order_placed: leads.filter(l => l.status === 'order_placed').length
      };

      // Find bottleneck stage (highest drop-off)
      const stages = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed'];
      let maxDrop = 0;
      let bottleneckStage = '';
      
      for (let i = 0; i < stages.length - 1; i++) {
        const currentCount = stageDistribution[stages[i] as keyof typeof stageDistribution];
        const nextCount = stageDistribution[stages[i + 1] as keyof typeof stageDistribution];
        const drop = currentCount - nextCount;
        const dropRate = currentCount > 0 ? (drop / currentCount) * 100 : 0;
        
        if (dropRate > maxDrop && currentCount > 5) {
          maxDrop = dropRate;
          bottleneckStage = stages[i];
        }
      }

      if (maxDrop > 50 && bottleneckStage) {
        newInsights.push({
          insight: "🔍 Pipeline Bottleneck Identified",
          recommendation: `${maxDrop.toFixed(0)}% drop-off at '${bottleneckStage.replace('_', ' ')}' stage.`,
          actions: `Focus on improving ${bottleneckStage.replace('_', ' ')} to ${stages[stages.indexOf(bottleneckStage) + 1].replace('_', ' ')} transition.`
        });
      }

      // 3. Revenue & Performance Trends
      if (revenueData.length >= 3) {
        const recentRevenue = revenueData.slice(-3).map(d => d.revenue);
        const avgRecent = recentRevenue.reduce((a, b) => a + b, 0) / recentRevenue.length;
        const trend = recentRevenue[2] - recentRevenue[0];
        const trendPercent = recentRevenue[0] > 0 ? (trend / recentRevenue[0]) * 100 : 0;
        
        if (trendPercent > 15) {
          newInsights.push({
            insight: "📈 Strong Revenue Growth Trend",
            recommendation: `Revenue increased by ${trendPercent.toFixed(1)}% over recent period.`,
            actions: "Analyze factors driving growth and scale successful initiatives."
          });
        } else if (trendPercent < -15) {
          newInsights.push({
            insight: "📉 Revenue Decline Detected",
            recommendation: `Revenue decreased by ${Math.abs(trendPercent).toFixed(1)}% recently.`,
            actions: "Immediate review needed: analyze lead quality, pricing, and market conditions."
          });
        }
      }

      if (revenueData.length >= 2) {
        const latest = revenueData[revenueData.length - 1].revenue;
        const previous = revenueData[revenueData.length - 2].revenue;
        if (previous > 0) {
          const changePct = ((latest - previous) / previous) * 100;
          if (Math.abs(changePct) >= 50) {
            anomalyAlerts.push({
              title: 'Revenue Volatility Detected',
              detail: `Revenue changed by ${Math.abs(changePct).toFixed(1)}% compared to the previous period.`,
              severity: 'warning'
            });
          }
        }
      }

      // 4. Branch Performance Insights
      if (branchData.length > 1) {
        const sortedBranches = [...branchData].sort((a, b) => b.revenue - a.revenue);
        const topBranch = sortedBranches[0];
        const bottomBranch = sortedBranches[sortedBranches.length - 1];
        const avgRevenue = branchData.reduce((sum, b) => sum + b.revenue, 0) / branchData.length;
        
        if (topBranch.revenue > avgRevenue * 1.5) {
          newInsights.push({
            insight: `🏆 ${topBranch.branch} Outperforming`,
            recommendation: `Generates ${((topBranch.revenue / avgRevenue - 1) * 100).toFixed(0)}% more revenue than average.`,
            actions: `Schedule knowledge-sharing session with ${topBranch.branch} team to replicate success.`
          });
        }
        
        if (bottomBranch.revenue < avgRevenue * 0.5 && branchData.length > 2) {
          newInsights.push({
            insight: `⚡ ${bottomBranch.branch} Needs Support`,
            recommendation: `Performance is ${((1 - bottomBranch.revenue / avgRevenue) * 100).toFixed(0)}% below average.`,
            actions: `Provide additional training and resources to ${bottomBranch.branch} team.`
          });
        }

        if (branchData.length >= 2) {
          const revenues = branchData.map((b) => b.revenue);
          const mean = revenues.reduce((sum, v) => sum + v, 0) / revenues.length;
          branchData.forEach((branch) => {
            if (mean > 0) {
              const deviation = Math.abs((branch.revenue - mean) / mean) * 100;
              if (deviation > 200) {
                anomalyAlerts.push({
                  title: `${branch.branch} Performance Outlier`,
                  detail: `Revenue is ${Math.abs((branch.revenue / mean - 1) * 100).toFixed(0)}% ${branch.revenue > mean ? 'higher' : 'lower'} than the network average.`,
                  severity: 'info'
                });
              }
            }
          });
        }
      }

      // 5. Sales Rep Performance
      if (allRepData.length > 0) {
        const topRep = allRepData[0];
        const avgRepRevenue = allRepData.reduce((sum, r) => sum + r.revenue, 0) / allRepData.length;
        
        if (topRep.revenue > avgRepRevenue * 1.4) {
          newInsights.push({
            insight: `⭐ ${topRep.rep} - Star Performer`,
            recommendation: `Generating ${((topRep.revenue / avgRepRevenue - 1) * 100).toFixed(0)}% more revenue than team average.`,
            actions: "Consider mentorship program and incentive recognition."
          });
        } else {
          newInsights.push({
            insight: `👤 ${topRep.rep} - Top Performer`,
            recommendation: `Leading the team with $${topRep.revenue.toLocaleString()} delivered revenue in the selected filters.`,
            actions: "Review this rep's pipeline strategy and share practical tactics with the team."
          });
        }
      }

      // 6. Lead Aging Analysis
      const oldLeads = leads.filter(l => {
        if (l.status === 'delivered' || l.status === 'lost') return false;
        const daysSinceActivity = Math.floor((new Date().getTime() - new Date(l.last_activity_at).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceActivity > 5;
      }).length;

      if (oldLeads > totalLeads * 0.3 && totalLeads > 10) {
        newInsights.push({
          insight: "⏰ Stale Leads Alert",
          recommendation: `${oldLeads} leads (${((oldLeads / totalLeads) * 100).toFixed(0)}%) have no activity for 5+ days.`,
          actions: "Implement automated follow-up reminders and lead nurturing campaigns."
        });
      }

      if (oldLeads > totalLeads * 0.45 && totalLeads > 20) {
        anomalyAlerts.push({
          title: 'Unusual Stale Lead Concentration',
          detail: `${((oldLeads / totalLeads) * 100).toFixed(0)}% of open leads are stale (5+ days inactive).`,
          severity: 'warning'
        });
      }

      const toTitleCase = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (funnelData.length > 1) {
        let largestDrop = 0;
        let fromStage = '';
        let toStage = '';
        for (let i = 0; i < funnelData.length - 1; i++) {
          const current = funnelData[i].count;
          const next = funnelData[i + 1].count;
          const dropRate = current > 0 ? ((current - next) / current) * 100 : 0;
          if (dropRate > largestDrop) {
            largestDrop = dropRate;
            fromStage = toTitleCase(funnelData[i].stage);
            toStage = toTitleCase(funnelData[i + 1].stage);
          }
        }
        if (largestDrop > 50) {
          anomalyAlerts.push({
            title: 'Pipeline Drop-off Detected',
            detail: `${largestDrop.toFixed(0)}% of leads drop between ${fromStage} and ${toStage}.`,
            severity: 'error'
          });
        }
      }

      // 7. Deal Value Insights
      const deliveredDeals = leads.filter(l => l.status === 'delivered');
      if (deliveredDeals.length > 0) {
        const avgDealValue = deliveredDeals.reduce((sum, l) => sum + l.deal_value, 0) / deliveredDeals.length;
        const highValueDeals = deliveredDeals.filter(l => l.deal_value > avgDealValue * 1.5).length;
        
        if (highValueDeals > 0) {
          newInsights.push({
            insight: "💰 High-Value Opportunities",
            recommendation: `${highValueDeals} deals closed above average value ($${avgDealValue.toLocaleString()}).`,
            actions: "Focus on replicating conditions that lead to higher-value sales."
          });
        }
      }

      // Branch comparison insights
      const branchComparison = generateBranchInsights(branchData, leads);
      setBranchInsights(branchComparison);

      // Key Insight Banner
      setKeyInsight(generateKeyInsight({ revenueData, funnelData, leads, branchData, filters }));

      setInsights(newInsights);
      const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
      anomalyAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      setAnomalies(anomalyAlerts.slice(0, 6));

      // Generate Executive Summary
      generateExecutiveSummary(leads, kpis, branchData, repData, funnelData, filters, branches, anomalyAlerts);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const generateExecutiveSummary = (
    leads: Lead[],
    kpis: KPIs,
    branchData: BranchPerformanceData[],
    repData: RepPerformanceData[],
    funnelData: FunnelItem[],
    currentFilters: FilterOptions,
    currentBranches: { label: string; value: string }[],
    currentAnomalies: AnomalyAlert[]
  ) => {
    const topBranch = branchData.length > 0
      ? [...branchData].sort((a, b) => b.revenue - a.revenue)[0]
      : null;
    const topRep = repData.length > 0 ? repData[0] : null;

    const networkAvgRevenue = branchData.length > 0
      ? branchData.reduce((sum, b) => sum + b.revenue, 0) / branchData.length
      : 0;

    const hasDateFilter = !!(currentFilters.startDate || currentFilters.endDate);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const periodLabel = hasDateFilter
      ? [currentFilters.startDate ? fmt(currentFilters.startDate) : '', currentFilters.endDate ? fmt(currentFilters.endDate) : ''].filter(Boolean).join(' – ')
      : 'this period';

    const selectedBranchIds = [
      ...(currentFilters.branchIds ?? []),
      ...(currentFilters.branchId ? [currentFilters.branchId] : [])
    ].filter(Boolean);
    const isSingleBranchView = selectedBranchIds.length === 1;
    const selectedBranchName = isSingleBranchView
      ? currentBranches.find(b => b.value === selectedBranchIds[0])?.label ?? 'Selected Branch'
      : null;

    const topAnomaly = currentAnomalies.find(a => a.severity === 'error')
      ?? currentAnomalies.find(a => a.severity === 'warning')
      ?? currentAnomalies[0]
      ?? null;

    let headline = '';
    const bullets: string[] = [];

    if (isSingleBranchView && selectedBranchName) {
      // Branch-specific view
      const branchStats = branchData.find(b => b.branch === selectedBranchName)
        ?? (branchData.length === 1 ? branchData[0] : null);

      if (branchStats && networkAvgRevenue > 0) {
        const diffPct = ((branchStats.revenue - networkAvgRevenue) / networkAvgRevenue) * 100;
        const hasBranchAnomaly = currentAnomalies.some(a => a.title.includes(selectedBranchName));
        const avgConversion = branchData.length > 0
          ? branchData.reduce((sum, b) => sum + b.conversionRate, 0) / branchData.length
          : 0;
        const convIsWeak = avgConversion > 0 && branchStats.conversionRate < avgConversion * 0.75;
        const convIsStrong = avgConversion > 0 && branchStats.conversionRate >= avgConversion * 1.1;
        if (hasBranchAnomaly && topAnomaly) {
          // Determine revenue direction from anomaly title/detail
          const rawDetail = topAnomaly.detail.toLowerCase();
          const isRevGrowth = rawDetail.includes('above') || rawDetail.includes('growth') ||
            (rawDetail.includes('period') && /\d+\.?\d*%/.test(rawDetail) &&
              !rawDetail.includes('below') && !rawDetail.includes('drop') && !rawDetail.includes('declin'));
          const revenueDir = isRevGrowth ? 'strong revenue growth' : 'notable revenue movement';
          const convClause = convIsWeak
            ? `but conversion performance remains weak at ${branchStats.conversionRate.toFixed(1)}%`
            : convIsStrong
              ? `with healthy conversion activity at ${branchStats.conversionRate.toFixed(1)}%`
              : `with conversion tracking near the network average`;
          headline = `${selectedBranchName} shows ${revenueDir} vs the previous period, ${convClause}.`;
        } else if (diffPct >= 20) {
          headline = `${selectedBranchName} is currently leading revenue growth, ${diffPct.toFixed(0)}% above the network average.`;
        } else if (diffPct <= -20) {
          headline = `${selectedBranchName} is ${Math.abs(diffPct).toFixed(0)}% below the network average, indicating potential operational issues at this location.`;
        } else {
          headline = `${selectedBranchName} is tracking near the network average with $${branchStats.revenue.toLocaleString()} in revenue ${periodLabel}.`;
        }
      } else {
        headline = `Showing data for ${selectedBranchName} — ${kpis.totalLeads.toLocaleString()} leads ${periodLabel}.`;
      }

      bullets.push(`$${kpis.totalRevenue.toLocaleString()} revenue generated ${periodLabel} from ${kpis.totalLeads.toLocaleString()} leads`);
      bullets.push(`${kpis.conversionRate.toFixed(1)}% conversion rate with ${kpis.deliveredVehicles.toLocaleString()} vehicles delivered`);
      if (topRep) {
        bullets.push(`${topRep.rep} is the top performer at this branch with $${topRep.revenue.toLocaleString()} in revenue`);
      } else {
        const negCount = funnelData.find(f => f.stage === 'negotiation')?.count ?? 0;
        bullets.push(`Pipeline value at $${kpis.pipelineValue.toLocaleString()} with ${negCount.toLocaleString()} leads in active negotiation`);
      }
    } else {
      // Global or multi-branch view
      const viewLabel = selectedBranchIds.length > 1 ? 'Across selected branches' : 'Across all branches';
      if (topAnomaly) {
        headline = `${topAnomaly.title} — ${topAnomaly.detail}`;
      } else if (kpis.totalLeads === 0) {
        headline = 'No leads match the current filters. Adjust the date range or branch selection.';
      } else if (kpis.conversionRate >= 25) {
        headline = `Revenue growth remains strong with ${kpis.deliveredVehicles.toLocaleString()} vehicles delivered from ${kpis.totalLeads.toLocaleString()} leads ${periodLabel}.`;
      } else if (kpis.conversionRate < 15 && kpis.totalLeads > 20) {
        headline = `Conversion is below target at ${kpis.conversionRate.toFixed(1)}% — pipeline shows opportunity for improvement across ${kpis.totalLeads.toLocaleString()} active leads ${periodLabel}.`;
      } else {
        headline = `${viewLabel}: $${kpis.totalRevenue.toLocaleString()} revenue with ${kpis.deliveredVehicles.toLocaleString()} delivered vehicles and a ${kpis.conversionRate.toFixed(1)}% conversion rate ${periodLabel}.`;
      }

      bullets.push(`$${kpis.totalRevenue.toLocaleString()} total revenue from ${kpis.deliveredVehicles.toLocaleString()} delivered vehicles ${periodLabel}`);
      if (topBranch) {
        const vsAvg = networkAvgRevenue > 0
          ? ` — ${((topBranch.revenue / networkAvgRevenue - 1) * 100).toFixed(0)}% above network average`
          : '';
        bullets.push(`${topBranch.branch} leads with $${topBranch.revenue.toLocaleString()} in revenue${vsAvg}`);
      }
      const negCount = funnelData.find(f => f.stage === 'negotiation')?.count ?? 0;
      const pipelineNote = negCount > 0
        ? `Pipeline includes ${negCount.toLocaleString()} leads in active negotiation and $${kpis.pipelineValue.toLocaleString()} in pending value`
        : `Pipeline value stands at $${kpis.pipelineValue.toLocaleString()} with ${kpis.ordersPlaced.toLocaleString()} orders placed`;
      bullets.push(pipelineNote);
    }

    setExecutiveSummary({ headline, bullets });
  };

  const handleBranchClick = async (branchName: string) => {
    setSelectedBranch(branchName);

    const branch = branches.find((b) => b.label === branchName);
    if (!branch) return;

    const branchLeads = filteredLeads.filter((l) => l.branch_id === branch.value);

    const branchKpis = calculateKPIs(branchLeads);
    const allRepData = await getRepPerformanceData(filters, 1000);
    const branchRepIds = new Set(branchLeads.map((lead) => lead.assigned_to));
    const branchReps = allRepData.filter((rep) => branchRepIds.has(rep.rep_id));

    setBranchDetailData({
      name: branchName,
      branchId: branch.value,
      kpis: branchKpis,
      leads: branchLeads,
      reps: branchReps
    });
  };

  const handleRepClick = async (repName: string, repId: string) => {
    setSelectedRep(repName);

    const repLeads = filteredLeads.filter((l) => l.assigned_to === repId);

    const repKpis = calculateKPIs(repLeads);

    setRepDetailData({
      name: repName,
      repId,
      kpis: repKpis,
      leads: repLeads
    });
  };

  const getLeadExportRows = (leads: Lead[]) =>
    leads.map((lead) => ({
      id: lead.id,
      customer_name: lead.customer_name,
      phone: lead.phone,
      source: lead.source,
      model_interested: lead.model_interested,
      status: lead.status,
      assigned_to: lead.assigned_to,
      branch_id: lead.branch_id,
      created_at: lead.created_at,
      last_activity_at: lead.last_activity_at,
      expected_close_date: lead.expected_close_date,
      deal_value: lead.deal_value,
      lost_reason: lead.lost_reason ?? ''
    }));

  const getSummaryExportRows = () => {
    const summaryRows: Array<Record<string, unknown>> = [];
    if (kpis) {
      summaryRows.push(
        { metric: 'Total Leads', value: kpis.totalLeads },
        { metric: 'Orders Placed', value: kpis.ordersPlaced },
        { metric: 'Delivered Vehicles', value: kpis.deliveredVehicles },
        { metric: 'Total Revenue', value: kpis.totalRevenue },
        { metric: 'Conversion Rate', value: Number(kpis.conversionRate.toFixed(2)) },
        { metric: 'Pipeline Value', value: kpis.pipelineValue }
      );
    }

    insights.forEach((item, index) => {
      summaryRows.push({
        metric: `Insight ${index + 1}`,
        value: item.insight,
        recommendation: item.recommendation,
        actions: item.actions
      });
    });

    return summaryRows;
  };

  const getPerformanceComparisonRows = () => [
    ...repPerformanceData.map((rep) => ({
      entity_type: 'Rep',
      name: rep.rep,
      id: rep.rep_id,
      revenue: rep.revenue,
      orders: rep.orders,
      conversion_rate: Number(rep.conversionRate.toFixed(2))
    })),
    ...branchPerformanceData.map((branch) => ({
      entity_type: 'Branch',
      name: branch.branch,
      id: '',
      revenue: branch.revenue,
      orders: branch.orders,
      conversion_rate: Number(branch.conversionRate.toFixed(2))
    }))
  ];

  const PALETTES = {
    warning: { accent: "#f89c24", bg: "#fffbf0", title: "#8a4f00", border: "#f3d079" },
    success: { accent: "#1d8102", bg: "#f2f8f0", title: "#1d6503", border: "#b2dba0" },
    error:   { accent: "#d13212", bg: "#fff5f4", title: "#d13212", border: "#f5bcb5" },
    info:    { accent: "#0972d3", bg: "#f0f4ff", title: "#0550ae", border: "#a9c4f5" },
  } as const;

  const InsightCard = ({ insight: i, alertType }: { insight: Insight; alertType: keyof typeof PALETTES }) => {
    const palette = PALETTES[alertType];
    const truncStyle: React.CSSProperties = {
      overflow: "hidden",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      fontSize: "13px",
      lineHeight: "1.5",
      color: "#414d5c",
    };
    return (
      <div
        style={{
          height: "148px",
          border: `1px solid ${palette.border}`,
          borderLeft: `4px solid ${palette.accent}`,
          borderRadius: "8px",
          padding: "14px 16px",
          backgroundColor: palette.bg,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
        title={`${i.insight}\n\nAnalysis: ${i.recommendation}\n\nRecommended Actions: ${i.actions}`}
      >
        <div style={{
          fontWeight: 700,
          fontSize: "14px",
          color: palette.title,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {i.insight}
        </div>
        <div style={truncStyle}>
          <strong>📊 Analysis:</strong> {i.recommendation}
        </div>
        <div style={truncStyle}>
          <strong>🎯 Actions:</strong> {i.actions}
        </div>
      </div>
    );
  };

  return (
    <div suppressHydrationWarning={true} style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <ShareActions filters={filters} kpis={kpis} insights={insights} />
      <AppLayout
        navigationHide={true}
        toolsHide={true}
        stickyNotifications={true}
        notifications={
          <Container>
            <FiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              branches={branches}
            />
          </Container>
        }
        content={
          <ContentLayout
            header={
              <Header 
                variant="h1"
                description="Executive Analytics Dashboard - Real-time Sales Performance & Pipeline Intelligence"
              >
                DealerPulse Analytics
              </Header>
            }
          >
            <SpaceBetween size="l" direction="vertical">

              {/* Key Insight Banner */}
              {keyInsight && (
                <div style={{
                  background: '#f0f4ff',
                  border: '1px solid #c6d6f7',
                  borderLeft: '4px solid #1f77b4',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '20px', lineHeight: '1.4', flexShrink: 0 }}>💡</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0d1b2e', marginBottom: '4px' }}>Key Insight</div>
                    <div style={{ fontSize: '14px', color: '#3d4c5e', lineHeight: '1.5' }}>{keyInsight}</div>
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              <Container>
                <div style={{ padding: "8px 4px" }}>
                  <SpaceBetween size="l" direction="vertical">
                    <Header variant="h2">📊 Executive Summary</Header>
                    {!executiveSummary ? (
                      <Box fontSize="body-m" color="text-body-secondary">Loading summary...</Box>
                    ) : (
                      <SpaceBetween size="m" direction="vertical">
                        <div style={{
                          fontSize: "26px",
                          fontWeight: 600,
                          lineHeight: "1.4",
                          color: "#0d1b2e",
                          letterSpacing: "-0.2px",
                        }}>
                          {executiveSummary.headline}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {executiveSummary.bullets.map((bullet, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              <span style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: "#0972d3",
                                flexShrink: 0,
                                marginTop: "8px",
                              }} />
                              <span style={{
                                fontSize: "16px",
                                lineHeight: "1.6",
                                color: "#414d5c",
                              }}>
                                {bullet}
                              </span>
                            </div>
                          ))}
                        </div>
                      </SpaceBetween>
                    )}
                  </SpaceBetween>
                </div>
              </Container>

              {/* KPI Metrics — Three-Tier Hierarchy */}
              {kpis && (
                <SpaceBetween size="m" direction="vertical">
                  <Header variant="h2">Key Performance Indicators</Header>

                  {/* Tier 1 — Primary KPI */}
                  <Container>
                    <Box textAlign="center" padding={{ top: "xl", bottom: "xl" }}>
                      <Box fontSize="body-s" color="text-body-secondary" padding={{ bottom: "xs" }}>
                        TOTAL REVENUE
                      </Box>
                      <Box
                        fontSize="display-l"
                        fontWeight="heavy"
                        color="text-status-info"
                        padding={{ bottom: "xs" }}
                      >
                        ${kpis.totalRevenue.toLocaleString()}
                      </Box>
                      <Box fontSize="body-s" color="text-body-secondary">
                        Revenue generated from delivered vehicles in the selected period
                      </Box>
                    </Box>
                  </Container>

                  {/* Tier 2 — Driver KPIs */}
                  <ColumnLayout columns={3} variant="text-grid">
                    <Container>
                      <Box textAlign="center" padding={{ top: "l", bottom: "l" }}>
                        <Box fontSize="body-s" color="text-body-secondary" padding={{ bottom: "xs" }}>
                          DELIVERED VEHICLES
                        </Box>
                        <Box fontSize="display-l" fontWeight="heavy" color="text-status-info" padding={{ bottom: "xs" }}>
                          {kpis.deliveredVehicles.toLocaleString()}
                        </Box>
                        <Box fontSize="body-s" color="text-body-secondary">
                          Vehicles successfully delivered
                        </Box>
                      </Box>
                    </Container>
                    <Container>
                      <Box textAlign="center" padding={{ top: "l", bottom: "l" }}>
                        <Box fontSize="body-s" color="text-body-secondary" padding={{ bottom: "xs" }}>
                          CONVERSION RATE
                        </Box>
                        <Box fontSize="display-l" fontWeight="heavy" color="text-status-inactive" padding={{ bottom: "xs" }}>
                          {kpis.conversionRate.toFixed(1)}%
                        </Box>
                        <Box fontSize="body-s" color="text-body-secondary">
                          Delivered vehicles / total leads
                        </Box>
                      </Box>
                    </Container>
                    <Container>
                      <Box textAlign="center" padding={{ top: "l", bottom: "l" }}>
                        <Box fontSize="body-s" color="text-body-secondary" padding={{ bottom: "xs" }}>
                          PIPELINE VALUE
                        </Box>
                        <Box fontSize="display-l" fontWeight="heavy" color="text-status-inactive" padding={{ bottom: "xs" }}>
                          ${kpis.pipelineValue.toLocaleString()}
                        </Box>
                        <Box fontSize="body-s" color="text-body-secondary">
                          Revenue potential from active deals
                        </Box>
                      </Box>
                    </Container>
                  </ColumnLayout>

                  {/* Tier 3 — Context KPIs */}
                  <ColumnLayout columns={3} variant="text-grid">
                    <Container>
                      <Box textAlign="center" padding={{ top: "s", bottom: "s" }}>
                        <Box fontSize="body-s" color="text-body-secondary" padding={{ bottom: "xxs" }}>
                          TOTAL LEADS
                        </Box>
                        <Box fontSize="heading-xl" fontWeight="bold" color="text-body-secondary" padding={{ bottom: "xxs" }}>
                          {kpis.totalLeads.toLocaleString()}
                        </Box>
                        <Box fontSize="body-s" color="text-status-inactive">
                          All leads in the selected period
                        </Box>
                      </Box>
                    </Container>
                    <Container>
                      <Box textAlign="center" padding={{ top: "s", bottom: "s" }}>
                        <Box fontSize="body-s" color="text-body-secondary" padding={{ bottom: "xxs" }}>
                          ORDERS PLACED
                        </Box>
                        <Box fontSize="heading-xl" fontWeight="bold" color="text-body-secondary" padding={{ bottom: "xxs" }}>
                          {kpis.ordersPlaced.toLocaleString()}
                        </Box>
                        <Box fontSize="body-s" color="text-status-inactive">
                          Confirmed orders awaiting delivery
                        </Box>
                      </Box>
                    </Container>
                    <Container>
                      <Box textAlign="center" padding={{ top: "s", bottom: "s" }}>
                        <Box fontSize="body-s" color="text-body-secondary" padding={{ bottom: "xxs" }}>
                          SALES REPS
                        </Box>
                        <Box fontSize="heading-xl" fontWeight="bold" color="text-body-secondary" padding={{ bottom: "xxs" }}>
                          {kpiItems.find(k => k.metric === "Total Sales Reps")?.value ?? "—"}
                        </Box>
                        <Box fontSize="body-s" color="text-status-inactive">
                          Active sales representatives
                        </Box>
                      </Box>
                    </Container>
                  </ColumnLayout>
                </SpaceBetween>
              )}

              {/* Sales Pipeline Analysis */}
              <Grid gridDefinition={[{ colspan: { default: 12, m: 6 } }, { colspan: { default: 12, m: 6 } }]}>
                <SalesFunnelChart funnelData={funnelItems} />
                <RevenueTrendChart data={revenueTrendData} filters={filters} branches={branches} />
              </Grid>

              {/* Performance Comparison */}
              <Grid gridDefinition={[{ colspan: { default: 12, m: 6 } }, { colspan: { default: 12, m: 6 } }]}>
                <BranchPerformanceChart
                  data={branchPerformanceData}
                  filters={filters}
                  branches={branches}
                  onBranchClick={handleBranchClick}
                />
                <RepLeaderboardChart data={repPerformanceData} onRepClick={handleRepClick} />
              </Grid>

              {/* Lead Health & Forecasting */}
              <Grid gridDefinition={[{ colspan: { default: 12, m: 6 } }, { colspan: { default: 12, m: 6 } }]}>
                <LeadAgingChart data={leadAgingData} />
                <PipelineForecastChart data={pipelineForecastData} />
              </Grid>

              {/* Anomaly Detection */}
              <Container>
                <SpaceBetween size="m" direction="vertical">
                  <Header
                    variant="h2"
                    description="Automatically flagged unusual patterns in the selected data"
                  >
                    Automated Alerts
                  </Header>
                  {anomalies.length === 0 ? (
                    <Box color="text-status-success" fontSize="body-m">
                      No unusual patterns detected in the selected data.
                    </Box>
                  ) : (
                    <SpaceBetween size="s" direction="vertical">
                      {anomalies.map((anomaly, idx) => (
                        <Alert key={idx} type={anomaly.severity} header={anomaly.title} visible={true} dismissible={false}>
                          {anomaly.detail}
                        </Alert>
                      ))}
                    </SpaceBetween>
                  )}
                </SpaceBetween>
              </Container>

              {/* What-if Scenario */}
              <WhatIfScenarioPanel funnelData={funnelItems} kpis={kpis} />

              {/* Insights & Recommendations */}
              <Container>
                <SpaceBetween size="m" direction="vertical">
                  <Header 
                    variant="h2"
                    description="Data-driven recommendations for immediate action"
                  >
                    💡 Insights & Recommendations
                  </Header>
                  {insights.length === 0 ? (
                    <Box textAlign="center" padding="l" color="text-body-secondary">
                      Analyzing your data for actionable recommendations...
                    </Box>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(400px, 100%), 1fr))", gap: "16px" }}>
                      {insights.map((i, idx) => {
                        let alertType: 'error' | 'warning' | 'info' | 'success' = 'info';
                        if (i.insight.includes('⚠️') || i.insight.includes('Alert') || i.insight.includes('⏰') || i.insight.includes('📉')) {
                          alertType = 'warning';
                        } else if (i.insight.includes('✅') || i.insight.includes('📈') || i.insight.includes('🏆') || i.insight.includes('⭐') || i.insight.includes('💰')) {
                          alertType = 'success';
                        } else if (i.insight.includes('⚡') || i.insight.includes('Needs')) {
                          alertType = 'error';
                        }
                        return <InsightCard key={idx} insight={i} alertType={alertType} />;
                      })}
                    </div>
                  )}
                </SpaceBetween>
              </Container>

              {/* Branch Comparison Insights */}
              {branchInsights.length > 0 && (
                <Container>
                  <SpaceBetween size="m" direction="vertical">
                    <Header
                      variant="h2"
                      description="Automated branch-vs-network comparisons based on current filters"
                    >
                      🏢 Branch Comparison Insights
                    </Header>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(400px, 100%), 1fr))", gap: "16px" }}>
                      {branchInsights.map((i, idx) => {
                        let alertType: 'error' | 'warning' | 'info' | 'success' = 'info';
                        if (i.insight.includes('⚠️')) {
                          alertType = 'warning';
                        } else if (i.insight.includes('🏆') || i.insight.includes('📈')) {
                          alertType = 'success';
                        }
                        return <InsightCard key={idx} insight={i} alertType={alertType} />;
                      })}
                    </div>
                  </SpaceBetween>
                </Container>
              )}
            </SpaceBetween>
          </ContentLayout>
        }
      />

      {/* Branch Detail Modal */}
      <Modal
        visible={selectedBranch !== null}
        onDismiss={() => setSelectedBranch(null)}
        header={`${selectedBranch} - Detailed Analysis`}
        size="large"
      >
        {branchDetailData && (
          <SpaceBetween size="l" direction="vertical">
            <ExportControls
              actions={[
                {
                  label: 'Export Filtered Leads CSV',
                  scope: 'filtered-leads',
                  rows: getLeadExportRows(filteredLeads)
                },
                {
                  label: 'Export KPI + Insights CSV',
                  scope: 'kpi-insights-summary',
                  rows: getSummaryExportRows()
                },
                {
                  label: 'Export Rep + Branch CSV',
                  scope: 'rep-branch-performance',
                  rows: getPerformanceComparisonRows()
                },
                {
                  label: 'Export Branch Drilldown CSV',
                  scope: 'branch-drilldown',
                  rows: getLeadExportRows(branchDetailData.leads)
                }
              ]}
            />
            <ColumnLayout columns={3} variant="text-grid">
              <Box textAlign="center">
                <Box fontSize="heading-xl">{branchDetailData.kpis.totalLeads}</Box>
                <Box color="text-body-secondary">Total Leads</Box>
              </Box>
              <Box textAlign="center">
                <Box fontSize="heading-xl">{branchDetailData.kpis.deliveredVehicles}</Box>
                <Box color="text-body-secondary">Delivered</Box>
              </Box>
              <Box textAlign="center">
                <Box fontSize="heading-xl">${branchDetailData.kpis.totalRevenue.toLocaleString()}</Box>
                <Box color="text-body-secondary">Revenue</Box>
              </Box>
            </ColumnLayout>
            <Table
              items={branchDetailData.leads.slice(0, 100)}
              columnDefinitions={[
                { id: 'customer', header: 'Customer', cell: (item: Lead) => item.customer_name },
                { id: 'status', header: 'Status', cell: (item: Lead) => item.status },
                { id: 'value', header: 'Deal Value', cell: (item: Lead) => `$${item.deal_value.toLocaleString()}` },
                { id: 'assigned', header: 'Assigned To', cell: (item: Lead) => item.assigned_to },
                { id: 'updated', header: 'Last Activity', cell: (item: Lead) => new Date(item.last_activity_at).toLocaleDateString() }
              ]}
              empty={
                <Box textAlign="center" color="text-body-secondary" padding="m">
                  No leads in this branch for the selected filters.
                </Box>
              }
              header={<Header>Branch Leads (Top 100)</Header>}
            />
            <Button onClick={() => setSelectedBranch(null)}>Close</Button>
          </SpaceBetween>
        )}
      </Modal>

      {/* Rep Detail Modal */}
      <Modal
        visible={selectedRep !== null}
        onDismiss={() => setSelectedRep(null)}
        header={`${selectedRep} - Performance Details`}
        size="medium"
      >
        {repDetailData && (
          <SpaceBetween size="l" direction="vertical">
            <ExportControls
              actions={[
                {
                  label: 'Export Filtered Leads CSV',
                  scope: 'filtered-leads',
                  rows: getLeadExportRows(filteredLeads)
                },
                {
                  label: 'Export KPI + Insights CSV',
                  scope: 'kpi-insights-summary',
                  rows: getSummaryExportRows()
                },
                {
                  label: 'Export Rep + Branch CSV',
                  scope: 'rep-branch-performance',
                  rows: getPerformanceComparisonRows()
                },
                {
                  label: 'Export Rep Drilldown CSV',
                  scope: 'rep-drilldown',
                  rows: getLeadExportRows(repDetailData.leads)
                }
              ]}
            />
            <ColumnLayout columns={2} variant="text-grid">
              <Box textAlign="center">
                <Box fontSize="heading-xl">{repDetailData.kpis.totalLeads}</Box>
                <Box color="text-body-secondary">Total Leads</Box>
              </Box>
              <Box textAlign="center">
                <Box fontSize="heading-xl">{repDetailData.kpis.conversionRate.toFixed(1)}%</Box>
                <Box color="text-body-secondary">Conversion Rate</Box>
              </Box>
            </ColumnLayout>
            <Table
              items={repDetailData.leads.slice(0, 100)}
              columnDefinitions={[
                { id: 'customer', header: 'Customer', cell: (item: Lead) => item.customer_name },
                { id: 'status', header: 'Status', cell: (item: Lead) => item.status },
                { id: 'value', header: 'Deal Value', cell: (item: Lead) => `$${item.deal_value.toLocaleString()}` },
                { id: 'branch', header: 'Branch', cell: (item: Lead) => item.branch_id },
                { id: 'updated', header: 'Last Activity', cell: (item: Lead) => new Date(item.last_activity_at).toLocaleDateString() }
              ]}
              empty={
                <Box textAlign="center" color="text-body-secondary" padding="m">
                  No leads assigned to this rep for the selected filters.
                </Box>
              }
              header={<Header>Rep Leads (Top 100)</Header>}
            />
            <Button onClick={() => setSelectedRep(null)}>Close</Button>
          </SpaceBetween>
        )}
      </Modal>
    </div>
  );
}
