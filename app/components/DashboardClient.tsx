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
import { calculateKPIs, KPIs, FunnelStage } from "../lib/metrics";

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
  const [executiveSummary, setExecutiveSummary] = useState<string>("");
  const [kpis, setKpis] = useState<KPIs | null>(null);
  
  // Drill-down state
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [branchDetailData, setBranchDetailData] = useState<any>(null);
  const [repDetailData, setRepDetailData] = useState<any>(null);

  const loadData = async () => {
    try {
      // Load branches for filter dropdown
      const [branchesData, salesReps] = await Promise.all([getBranches(), getSalesReps()]);
      setBranches(branchesData.map(b => ({ label: b.name, value: b.id })));

      // Load filtered data
      const leads = await getFilteredLeads(filters);

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

      setInsights(newInsights);

      // Generate Executive Summary
      generateExecutiveSummary(leads, kpis, branchData, repData, funnelData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const generateExecutiveSummary = (leads: Lead[], kpis: KPIs, branchData: BranchPerformanceData[], repData: RepPerformanceData[], funnelData: FunnelItem[]) => {
    // Find top performing branch
    const topBranch = branchData.length > 0 
      ? branchData.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current)
      : null;

    // Find biggest pipeline bottleneck
    const stages = funnelData;
    let maxDrop = 0;
    let bottleneckStage = '';
    let bottleneckRate = 0;
    
    for (let i = 0; i < stages.length - 1; i++) {
      const currentCount = stages[i].count;
      const nextCount = stages[i + 1].count;
      const drop = currentCount - nextCount;
      const dropRate = currentCount > 0 ? (drop / currentCount) * 100 : 0;
      
      if (dropRate > maxDrop && currentCount > 5) {
        maxDrop = dropRate;
        bottleneckStage = stages[i].stage.replace('_', ' ');
        bottleneckRate = ((nextCount / currentCount) * 100);
      }
    }

    // Determine revenue performance status
    let revenueStatus = "performing steadily";
    const targetRevenue = kpis.totalLeads * 25000; // Assume $25k average deal
    if (kpis.totalRevenue > targetRevenue * 0.9) {
      revenueStatus = "exceeding targets";
    } else if (kpis.totalRevenue < targetRevenue * 0.7) {
      revenueStatus = "below targets";
    }

    // Generate summary
    const summary = `Revenue this period reached $${(kpis.totalRevenue / 1000).toFixed(1)}K with a ${kpis.conversionRate.toFixed(1)}% conversion rate (${kpis.deliveredVehicles} vehicles delivered from ${kpis.totalLeads} leads). ${
      topBranch ? `${topBranch.branch} leads performance with $${topBranch.revenue.toLocaleString()} in revenue.` : 'Branch performance is balanced.'
    } ${
      bottleneckStage ? `The biggest pipeline loss occurs at the ${bottleneckStage} stage where only ${bottleneckRate.toFixed(0)}% progress to the next stage.` : 'Pipeline flow is healthy.'
    } Pipeline value stands at $${(kpis.pipelineValue / 1000).toFixed(1)}K. ${
      kpis.conversionRate < 15 ? 'Focus on improving lead qualification and follow-up processes.' : 'Maintain current sales momentum.'
    }`;

    setExecutiveSummary(summary);
  };

  const handleBranchClick = async (branchName: string) => {
    setSelectedBranch(branchName);
    
    // Load detailed branch data
    const leads = await getFilteredLeads(filters);
    const branchLeads = leads.filter(l => {
      const branch = branches.find(b => b.label === branchName);
      return branch && l.branch_id === branch.value;
    });

    const branchKpis = calculateKPIs(branchLeads);
    const reps = await getRepPerformanceData(filters);
    const branchReps = reps.filter(r => {
      // Filter reps by branch - this is simplified, you may need to adjust
      return true; // All reps for now
    });

    setBranchDetailData({
      name: branchName,
      kpis: branchKpis,
      leads: branchLeads,
      reps: branchReps
    });
  };

  const handleRepClick = async (repName: string) => {
    setSelectedRep(repName);
    
    // Load detailed rep data
    const leads = await getFilteredLeads(filters);
    const repLeads = leads.filter(l => {
      // This is simplified - would need to match by rep ID
      return true;
    });

    const repKpis = calculateKPIs(repLeads);

    setRepDetailData({
      name: repName,
      kpis: repKpis,
      leads: repLeads
    });
  };

  return (
    <div suppressHydrationWarning={true} style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <AppLayout
        navigationHide={true}
        toolsHide={true}
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
              {/* Global Filters */}
              <Container>
                <FiltersComponent
                  filters={filters}
                  onFiltersChange={setFilters}
                  branches={branches}
                />
              </Container>

              {/* Executive Summary */}
              <Container>
                <SpaceBetween size="m" direction="vertical">
                  <Header variant="h2">
                    📊 Executive Summary
                  </Header>
                  <Box fontSize="body-m" color="text-body-secondary">
                    {executiveSummary || "Loading executive summary..."}
                  </Box>
                </SpaceBetween>
              </Container>

              {/* KPI Metrics */}
              <Container>
                <SpaceBetween size="m" direction="vertical">
                  <Header variant="h2">Key Performance Indicators</Header>
                  <ColumnLayout columns={4} variant="text-grid">
                    {kpiItems.map((k) => (
                      <Box key={k.metric} textAlign="center" padding={{ top: "m", bottom: "m" }}>
                        <Box fontSize="display-l" fontWeight="heavy" color="text-status-info">
                          {k.value}
                        </Box>
                        <Box fontSize="heading-s" color="text-status-inactive" padding={{ top: "xs" }}>
                          {k.metric}
                        </Box>
                      </Box>
                    ))}
                  </ColumnLayout>
                </SpaceBetween>
              </Container>

              {/* Sales Pipeline Analysis */}
              <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                <SalesFunnelChart funnelData={funnelItems} />
                <RevenueTrendChart data={revenueTrendData} />
              </Grid>

              {/* Performance Comparison */}
              <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                <BranchPerformanceChart
                  data={branchPerformanceData}
                  onBranchClick={handleBranchClick}
                />
                <RepLeaderboardChart data={repPerformanceData} />
              </Grid>

              {/* Lead Health & Forecasting */}
              <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                <LeadAgingChart data={leadAgingData} />
                <PipelineForecastChart data={pipelineForecastData} />
              </Grid>

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
                    <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                      {insights.map((i, idx) => {
                        // Determine alert type based on insight content
                        let alertType: 'error' | 'warning' | 'info' | 'success' = 'info';
                        if (i.insight.includes('⚠️') || i.insight.includes('Alert') || i.insight.includes('⏰') || i.insight.includes('📉')) {
                          alertType = 'warning';
                        } else if (i.insight.includes('✅') || i.insight.includes('📈') || i.insight.includes('🏆') || i.insight.includes('⭐') || i.insight.includes('💰')) {
                          alertType = 'success';
                        } else if (i.insight.includes('⚡') || i.insight.includes('Needs')) {
                          alertType = 'error';
                        }
                        
                        return (
                          <Alert
                            key={idx}
                            header={i.insight}
                            visible={true}
                            type={alertType}
                            dismissible={false}
                          >
                            <SpaceBetween direction="vertical" size="s">
                              <TextContent>
                                <p><strong>📊 Analysis:</strong> {i.recommendation}</p>
                                <p><strong>🎯 Recommended Actions:</strong> {i.actions}</p>
                              </TextContent>
                            </SpaceBetween>
                          </Alert>
                        );
                      })}
                    </Grid>
                  )}
                </SpaceBetween>
              </Container>
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
            <Button onClick={() => setSelectedRep(null)}>Close</Button>
          </SpaceBetween>
        )}
      </Modal>
    </div>
  );
}
