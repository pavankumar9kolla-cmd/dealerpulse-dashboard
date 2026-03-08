# DECISIONS.md

## Overview

This project implements **DealerPulse Analytics**, an executive sales analytics dashboard for a multi-branch automotive dealership network.

The goal was to design a dashboard that goes beyond simple reporting and instead **helps sales managers identify risks, opportunities, and actions quickly**.

The dashboard focuses on three primary questions:

1. Is the business healthy right now?
2. Where in the pipeline are deals being lost?
3. Which branches or sales reps require attention?

The design emphasizes **clear insights, drill-down analysis, and decision-oriented visualizations** rather than simply displaying raw data.

---

# What I Chose to Build and Why

## 1. Executive Overview Dashboard

The top section surfaces the **most critical business signals immediately**.

Components include:

* Executive summary
* Key performance indicators
* Key insight banner

This ensures that leadership can understand the current state of the business within seconds.

Key metrics shown:

* Total leads
* Delivered vehicles
* Conversion rate
* Total revenue
* Pipeline value

These represent the **core health indicators for dealership sales operations**.

---

# 2. Dynamic Insight Banner

Instead of forcing users to interpret multiple charts, the dashboard automatically generates a **Key Insight summary** based on the filtered dataset.

Examples of insights include:

* Revenue growth trends
* Pipeline drop-off bottlenecks
* Lead aging risk
* Branch performance gaps

This approach follows **data storytelling principles**, where the most important takeaway is presented before the supporting charts.

---

# 3. Drill-Down Analytics

Users can move from **high-level network performance to branch-level insights**.

This is enabled through filters and comparative visualizations such as:

* Branch performance comparison
* Top sales reps ranking
* Pipeline stage distribution

This allows managers to quickly identify **which teams are driving performance or falling behind**.

---

# 4. Pipeline Funnel Analysis

A dedicated pipeline analysis identifies **where deals are dropping off** in the sales process.

Stages analyzed include:

* New
* Contacted
* Test Drive
* Negotiation
* Order Placed
* Delivered

Conversion rates between stages are calculated to detect bottlenecks.

For example, a large drop between **Test Drive and Negotiation** may indicate issues with pricing, follow-up, or customer readiness.

---

# 5. Lead Aging Monitoring

Leads that remain uncontacted for extended periods represent **lost revenue opportunities**.

The lead aging visualization highlights:

* fresh leads
* warming leads
* at-risk leads

This helps managers prioritize **follow-up activity before leads go cold**.

---

# 6. Forecasting and What-If Simulation

To help leadership understand future performance, the dashboard includes:

### Revenue Forecast

Projected revenue is calculated using **pipeline stage probabilities**.

Deals in later stages contribute more heavily to expected revenue.

### What-If Simulator

Managers can simulate improvements in conversion rates to estimate potential impact on:

* deliveries
* revenue

This helps answer questions such as:

"If we improve test drive conversion by 10%, what revenue impact could we expect?"

---

# 7. Anomaly Detection

The dashboard highlights unusual patterns automatically, including:

* sudden revenue volatility
* branch outliers
* unusual pipeline drop-offs

This ensures managers can quickly investigate unexpected performance changes.

---

# Key Product Decisions and Tradeoffs

## Prioritizing Insights Over Chart Quantity

Instead of maximizing the number of charts, the dashboard focuses on **actionable insights and clear narratives**.

This improves usability for executives who need quick answers rather than detailed exploration.

---

## Single Page Layout

All analytics are presented on a **single responsive page** instead of multiple navigation sections.

Benefits:

* faster scanning
* fewer clicks
* better context across metrics

Tradeoff:

* requires careful layout and prioritization to avoid clutter.

---

## Dynamic Filters

Filters were implemented globally so that all visualizations update together.

Supported filters include:

* branch selection
* date range

This allows users to analyze performance at different levels of detail.

---

## Chart Selection

Each visualization was chosen to match the type of data being analyzed.

Examples:

| Metric            | Visualization               |
| ----------------- | --------------------------- |
| Revenue trend     | Line chart                  |
| Branch comparison | Bar chart                   |
| Sales rep ranking | Horizontal bar chart        |
| Lead aging        | Distribution chart          |
| Pipeline          | Funnel / stage distribution |

This ensures that each chart communicates its message clearly.

---

# What I Would Build Next With More Time

If additional time were available, several enhancements could further improve the product:

### 1. Real Forecast Modeling

Use historical conversion rates and seasonality to generate more accurate forecasts.

### 2. Rep-Level Drilldowns

Allow managers to click a branch and view detailed performance for each sales representative.

### 3. Lead Follow-Up Alerts

Automatically flag leads that have not been contacted within a defined time threshold.

### 4. Pipeline Velocity Metrics

Measure how quickly deals move between stages.

### 5. Automated Insight Ranking

Prioritize insights based on estimated business impact.

---

# Interesting Patterns Observed in the Data

Several patterns emerge from the dataset:

### Pipeline Drop-Off

A significant percentage of leads drop between **Test Drive and Negotiation**, indicating a possible sales process bottleneck.

### Revenue Concentration

A small number of sales reps generate a disproportionate share of revenue, suggesting strong individual performers.

### Lead Aging Risk

Many leads remain active for more than a week, indicating potential follow-up gaps.

### Revenue Growth

Recent periods show noticeable revenue growth, suggesting strong sales momentum.

---

# Technologies Used

Frontend framework: React / Next.js
Visualization library: Recharts
Deployment platform: Vercel

The stack was chosen for rapid development, strong charting support, and simple deployment.

---

# Final Notes

The dashboard is designed to function not just as a reporting tool, but as a **decision support system** for dealership management.

The focus throughout development was to surface insights that help managers answer key operational questions quickly and take action where needed.

