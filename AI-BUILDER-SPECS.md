# Facilities & Capex Cost Analysis - AI Builder Specifications

## Executive Summary

**Purpose**: Analyze real estate and facilities costs as fixed expenses that cannot scale with enrollment, helping identify which schools are over/under-committed on facilities relative to capacity utilization.

**Core Insight**: Unlike headcount or consumables, real estate costs (lease, capex, utilities base load) are "locked in" once committed. This dashboard visualizes what percentage of each school's tuition at capacity is consumed by these fixed facility costs.

**Key Question**: "At full capacity, what percentage of each tuition dollar goes to facilities before we can invest in education?"

---

## Part 1: Business Context

### 1.1 The Fixed Cost Problem

Real estate and facilities present a unique challenge in education economics:

| Cost Type | Behavior | Examples | Can Scale Down? |
|-----------|----------|----------|-----------------|
| **Fixed** | Constant regardless of enrollment | Lease payments, base utilities, landscaping | ❌ No |
| **Semi-Variable** | Base + marginal per student | Security staffing, maintenance, IT | ⚠️ Partially |
| **Variable** | Scales linearly with students | Transportation, food services | ✅ Yes |

**The Core Problem**: A school with 10 students pays the same rent as one with 100 students. This creates massive per-student cost variance based on utilization.

### 1.2 Expense Behavior Rules

From the Facilities & Capex analysis, each expense category has defined fixed/variable splits:

| Expense Category | Cost Type | Fixed % | Variable % | Scaling Rule |
|------------------|-----------|---------|------------|--------------|
| Rent | Fixed | 100% | 0% | No change with students |
| Utilities | Semi-Variable | 60% | 40% | Base + partial $/student |
| Repairs & Maintenance | Semi-Variable | 70% | 30% | Base + usage-driven |
| IT Maintenance | Semi-Variable | 80% | 20% | Small $/student component |
| Landscaping | Fixed | 100% | 0% | Flat; space-driven |
| Janitorial/Toiletries | Semi-Variable | 80% | 20% | Direct $/student |
| Security Services | Semi-Variable | 80% | 20% | Base + step per tier |
| Transportation | Variable | 0% | 100% | Linear with enrollment |
| Food Services | Variable | 0% | 100% | Linear with enrollment |

### 1.3 Key Metrics

**Per Student @ Current Enrollment**:
- `Facilities Cost / Current Enrollment`
- Shows actual per-student burden today

**Per Student @ Capacity**:
- `Facilities Cost / Capacity`
- Shows target per-student cost when fully enrolled

**% of Tuition Consumed**:
- `(Facilities Cost / (Enrollment × Tuition)) × 100`
- Shows what portion of revenue goes to facilities

**Fixed Cost Burden**:
- Sum of (Cost × Fixed%) for each category
- The amount that CANNOT be reduced without relocating

---

## Part 2: Dashboard Requirements

### 2.1 Primary Views

#### View 1: Portfolio Summary
```
┌─────────────────────────────────────────────────────────────┐
│  FACILITIES & CAPEX PORTFOLIO OVERVIEW                       │
├─────────────────────────────────────────────────────────────┤
│  Total Facilities Costs    │  Total Fixed Costs    │ Avg %  │
│  $2.15M annual             │  $1.78M (83%)         │ 27%    │
├─────────────────────────────────────────────────────────────┤
│  Cost by Category (Stacked Bar)                              │
│  ████████████████████ Rent ($1.24M - 58%)                   │
│  ████████ Maintenance ($378K - 18%)                          │
│  █████ Security ($171K - 8%)                                 │
│  ████ IT ($166K - 8%)                                        │
│  ███ Utilities ($122K - 6%)                                  │
│  ██ Other ($67K - 3%)                                        │
└─────────────────────────────────────────────────────────────┘
```

#### View 2: School Comparison (Multi-Select)

**Metrics Toggle**:
- [ ] Per Student (Current)
- [ ] Per Student (At Capacity)
- [ ] % of Tuition (Current)
- [ ] % of Tuition (At Capacity)
- [ ] Per Square Foot

**School Comparison Table**:
| School | Current | Capacity | Util% | Facilities$ | Current $/Student | Capacity $/Student | % Tuition (Current) | % Tuition (Capacity) |
|--------|---------|----------|-------|-------------|-------------------|--------------------|--------------------|---------------------|
| Austin K-8 | 161 | 225 | 72% | $1,063K | $6,604 | $4,726 | 16.5% | 11.8% |
| Alpha High | 50 | 150 | 33% | $549K | $10,979 | $3,660 | 27.4% | 9.1% |
| Brownsville | 42 | 100 | 42% | $125K | $2,973 | $1,249 | 19.8% | 8.3% |

#### View 3: Fixed vs Variable Breakdown

**Per-School Waterfall**:
```
School: Alpha Miami (67 students, 25 capacity target)

Tuition Revenue @ Current:   $2,680,000 (67 × $40K)
├── Fixed Facilities:        -$52,000 (1.9%)
│   ├── Rent (100%):         -$20,000
│   ├── Utilities (60%):     -$2,785
│   ├── Maintenance (70%):   -$15,794
│   ├── Security (80%):      -$7,496
│   └── IT (80%):            -$9,805
├── Variable Facilities:     -$17,000 (0.6%)
│   ├── Transportation:      -$412
│   └── Variable portions
└── Remaining for Education: $2,611,000 (97.4%)
```

#### View 4: What-If Scenario Analysis

**Enrollment Slider**: [Current] ←→ [Capacity]

Shows how metrics change as enrollment approaches capacity:
- Fixed costs remain constant
- Variable costs scale proportionally
- Per-student burden decreases
- % of tuition consumed decreases

### 2.2 Drill-Down Capabilities

**Click on School** → Detailed breakdown:
- Cost breakdown by category (pie chart)
- Historical trend (if data available)
- Comparison to model/budget
- Wrike facilities status (linked from Ops Dashboard)

**Click on Category** → Cross-school comparison:
- Which schools have highest rent?
- Which have highest maintenance?
- Outlier detection

### 2.3 Filters and Controls

**Primary Filters**:
- School Type: [All] [Microschool] [Full Alpha] [High School] [Sports] [Other]
- State/Region: Multi-select
- Utilization Range: [0-25%] [25-50%] [50-75%] [75-100%]

**Analysis Period**:
- Quarter selector (Q1-Q4)
- Year selector
- YTD toggle

**View Mode**:
- School View (absolute numbers)
- Per-Student View (normalized)
- Comparison Mode (benchmark against model)

---

## Part 3: Klair Data Integration

### 3.1 Primary Data Sources

| Dashboard Component | Klair Context | MCP Tool | Key Tables |
|---------------------|---------------|----------|------------|
| **Facilities Costs** | `edu_financials` | `query_education_analytics` | `staging_education.quickbooks_pl_data` |
| **Expense Transactions** | `edu_expense_analysis` | `query_education_analytics` | `staging_education.quickbooks_expense_transactions` |
| **Student Enrollment** | `edu_operational_excellence` | `query_education_analytics` | `staging_education.students` |
| **Capacity/Budget** | `edu_financials` | `query_education_analytics` | `core_education.google_sheets_school_financial_models_summary` |
| **Facilities Status** | `edu_ops_dashboard` | `query_education_analytics` | `staging_education.wrike_folders`, `wrike_task_properties` |

### 3.2 Key Queries

#### Query 1: Facilities Costs by School

```sql
SELECT
  class_name as school_name,
  SUM(CASE WHEN account_name = '62200 Rent' THEN amount ELSE 0 END) as rent,
  SUM(CASE WHEN account_name = '62400 Utilities' THEN amount ELSE 0 END) as utilities,
  SUM(CASE WHEN account_name = '62300 Repairs and Maintenance' THEN amount ELSE 0 END) as maintenance,
  SUM(CASE WHEN account_name = '62301 IT Maintenance' THEN amount ELSE 0 END) as it_maintenance,
  SUM(CASE WHEN account_name = '62304 Security Services' THEN amount ELSE 0 END) as security,
  SUM(CASE WHEN account_name = '62500 Transportation' THEN amount ELSE 0 END) as transportation,
  SUM(CASE WHEN account_name = '60201 Contracted Labor - Facilities' THEN amount ELSE 0 END) as facilities_labor,
  SUM(amount) as total_facilities
FROM staging_education.quickbooks_pl_data
WHERE company_id = 'alpha'
  AND account_name IN (
    '62200 Rent', '62400 Utilities', '62300 Repairs and Maintenance',
    '62301 IT Maintenance', '62304 Security Services', '62500 Transportation',
    '60201 Contracted Labor - Facilities'
  )
  AND EXTRACT(YEAR FROM report_date_start) = 2024
GROUP BY class_name
ORDER BY total_facilities DESC;
```

#### Query 2: Current Enrollment by School

```sql
SELECT
  primary_campus_name as school_name,
  COUNT(*) as enrolled_students
FROM staging_education.students
WHERE admission_status = 'Enrolled'
GROUP BY primary_campus_name
ORDER BY enrolled_students DESC;
```

#### Query 3: School Capacity from Financial Models

```sql
SELECT
  school_name,
  model_name,
  metric_name,
  per_student_value,
  total_value
FROM core_education.google_sheets_school_financial_models_summary
WHERE model_name IN ('Model - Capacity', '$40K Alpha School / At Capacity')
  AND metric_name = 'Students'
ORDER BY school_name;
```

#### Query 4: Detailed Expense Transactions (for drill-down)

```sql
SELECT
  t.txn_date,
  t.vendor_name,
  t.class_name as school,
  t.account_name,
  t.department_name,
  t.line_amount,
  t.line_description
FROM staging_education.quickbooks_expense_transactions t
WHERE t.company_id = 'alpha'
  AND t.class_name = 'Austin K-8'
  AND (t.department_name LIKE 'FAC-%'
       OR t.account_name LIKE '622%'
       OR t.account_name LIKE '625%')
ORDER BY t.txn_date DESC
LIMIT 100;
```

#### Query 5: Facilities Status from Wrike

```sql
SELECT
  f.title as school_name,
  f.custom_status_name as status,
  f.custom_status_color as status_color,
  MAX(CASE WHEN p.property_name = 'Overall Site Stage' THEN p.property_value END) as site_stage
FROM staging_education.wrike_folders f
LEFT JOIN staging_education.wrike_folder_properties p ON f.folder_id = p.folder_id
WHERE f.is_project = true
GROUP BY f.folder_id, f.title, f.custom_status_name, f.custom_status_color
ORDER BY f.title;
```

#### Query 6: Historical Facilities Costs (for trends)

```sql
SELECT
  class_name as school_name,
  EXTRACT(YEAR FROM report_date_start) as year,
  EXTRACT(QUARTER FROM report_date_start) as quarter,
  SUM(CASE WHEN account_name LIKE '622%' OR account_name LIKE '625%'
           OR account_name = '60201 Contracted Labor - Facilities'
      THEN amount ELSE 0 END) as facilities_total
FROM staging_education.quickbooks_pl_data
WHERE company_id = 'alpha'
GROUP BY class_name, year, quarter
ORDER BY school_name, year, quarter;
```

### 3.3 School Name Mapping

QuickBooks class names may differ from student system campus names. Use this mapping:

| QuickBooks (class_name) | Students System (primary_campus_name) | Display Name |
|-------------------------|---------------------------------------|--------------|
| Austin K-8 | Alpha School Austin | Alpha Austin K-8 |
| Alpha High School | Alpha High School | Alpha High School |
| Brownsville K-8 | Alpha School Brownsville | Alpha Brownsville |
| Alpha Miami | Alpha School Miami | Alpha Miami |
| Alpha Santa Barbara | Alpha School Santa Barbara | Alpha Santa Barbara |
| GT School Georgetown | GT School | GT School |

### 3.4 Data Refresh Patterns

| Data Type | Refresh Frequency | Latency |
|-----------|-------------------|---------|
| QuickBooks P&L | Quarterly | 1-2 weeks post-quarter |
| Expense Transactions | Daily | 1 day |
| Student Enrollment | Real-time | Minutes |
| Financial Models | Monthly | Manual sync |
| Wrike Facilities | Hourly | Minutes |

---

## Part 4: Component Architecture

### 4.1 React Component Structure

```
FacilitiesCapexDashboard/
├── index.tsx                    # Main dashboard container
├── components/
│   ├── PortfolioSummary.tsx     # KPI cards and category breakdown
│   ├── SchoolComparisonTable.tsx # Sortable, filterable school table
│   ├── CostBreakdownChart.tsx   # Stacked bar or pie charts
│   ├── FixedVariableWaterfall.tsx # Waterfall chart for cost analysis
│   ├── EnrollmentScenarioSlider.tsx # What-if slider
│   ├── SchoolDetailDrawer.tsx   # Drill-down detail panel
│   └── MetricToggle.tsx         # View mode selector
├── hooks/
│   ├── useFacilitiesData.ts     # Klair data fetching
│   ├── useSchoolMetrics.ts      # Calculated metrics
│   └── useScenarioAnalysis.ts   # What-if calculations
├── utils/
│   ├── calculateFixedCosts.ts   # Fixed cost calculations
│   ├── formatters.ts            # Currency, percentage formatters
│   └── schoolNameMapping.ts     # Name normalization
└── types/
    └── facilities.types.ts      # TypeScript interfaces
```

### 4.2 State Management

```typescript
interface FacilitiesState {
  // Data
  schools: School[];
  portfolioSummary: PortfolioSummary;
  historicalData: HistoricalDataPoint[];

  // Filters
  selectedSchools: string[];
  selectedSchoolTypes: string[];
  selectedStates: string[];
  utilizationRange: [number, number];

  // View options
  activeView: AnalysisView;
  analysisQuarter: string;
  showComparison: boolean;

  // Scenario
  scenarioEnrollment: Record<string, number>; // school_id -> enrollment
}
```

### 4.3 API Endpoints

| Endpoint | Purpose | Klair Query |
|----------|---------|-------------|
| `GET /facilities/summary` | Portfolio overview | Query 1 aggregated |
| `GET /facilities/schools` | All schools with metrics | Query 1 + 2 + 3 |
| `GET /facilities/school/:id` | Single school detail | Query 1 + 4 filtered |
| `GET /facilities/trends` | Historical data | Query 6 |
| `GET /facilities/wrike-status` | Facilities ops status | Query 5 |

---

## Part 5: Visualization Specifications

### 5.1 Portfolio Summary Cards

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Total Facilities │  │ Fixed Portion    │  │ Avg % of Tuition │
│    $2.15M        │  │   $1.78M (83%)   │  │      27%         │
│ ▼ 5% vs model    │  │                  │  │ @ current enroll │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Colors**:
- Fixed costs: Red/Orange tones (warning - cannot reduce)
- Variable costs: Green tones (can optimize)
- % of tuition: Scale from green (<15%) to red (>35%)

### 5.2 School Comparison Table

**Columns**:
1. School Name (with school type badge)
2. Current / Capacity (with utilization bar)
3. Facilities Cost (sortable)
4. $/Student Current (sortable)
5. $/Student Capacity (sortable)
6. % of Tuition Current (color-coded)
7. % of Tuition Capacity (color-coded)
8. Fixed Cost % (of facilities)

**Row Actions**:
- Click row → Open detail drawer
- Checkbox → Add to comparison

### 5.3 Cost Category Breakdown

**Horizontal Stacked Bar** (one per school or portfolio total):
```
Austin K-8: ████████████████ Rent ████ Maint ██ Sec █ Util
Alpha High: ██████████ Rent ███████ Maint ███ Sec ██ Util
```

**Color Legend**:
- Rent: Deep Blue (#1e40af)
- Maintenance: Teal (#0d9488)
- Security: Purple (#7c3aed)
- IT: Indigo (#4f46e5)
- Utilities: Amber (#d97706)
- Transportation: Green (#16a34a)
- Other: Gray (#6b7280)

### 5.4 Fixed vs Variable Waterfall

```
Revenue @ Current
    │
    ├── Less: Fixed Costs (█████████ red)
    │         Rent
    │         Utilities (60%)
    │         Maintenance (70%)
    │         Security (80%)
    │
    ├── Less: Variable Costs (███ orange)
    │         Transportation
    │         Food
    │         Variable portions
    │
    └── = Remaining for Education (████████████████████ green)
```

---

## Part 6: Uncertainty and Data Quality Notes

### 6.1 Known Data Gaps

| Gap | Impact | Mitigation |
|-----|--------|------------|
| **Rent not in all schools** | Some schools show $0 rent | May be in different GL account or paid centrally |
| **Capex not in P&L** | Can't show capex per school | Need separate capex tracking source |
| **Square footage missing** | Can't calculate $/sqft | Add to school master data |
| **Lease terms unknown** | Can't project lease renewals | Add lease expiry dates |

### 6.2 Calculation Assumptions

1. **Fixed/Variable splits** are estimates based on industry standards and management input
2. **Capacity figures** come from financial models, which may not reflect physical capacity limits
3. **Tuition rates** assumed uniform within school type; actual may vary by student
4. **Annualization**: Quarterly data × 4 for schools with partial-year data may overstate

### 6.3 Data Validation Rules

```typescript
// Flag schools where data quality is uncertain
interface DataQualityFlags {
  hasRentData: boolean;
  hasFullYearData: boolean;
  enrollmentMatchesBudget: boolean;
  capacityIsPhysicalLimit: boolean;
}

// Schools to investigate
const dataQualityIssues = [
  { school: 'Alpha Tampa', issue: 'Only $128 in facilities costs - likely incomplete data' },
  { school: 'Alpha Houston', issue: 'Only $55 in facilities costs - likely not operating' },
  { school: 'Many microschools', issue: '$0 rent - may be co-located or rent paid centrally' }
];
```

---

## Part 7: Future Enhancements

### 7.1 Phase 2 Features

1. **Lease Management Integration**
   - Lease expiry dates and renewal terms
   - Rent escalation clauses
   - Early termination options

2. **Capex Tracking**
   - Shell & core costs by school
   - Fit-out costs by school
   - Amortization schedules

3. **Square Footage Analysis**
   - Cost per sqft benchmarks
   - Space utilization metrics
   - Students per sqft ratios

### 7.2 Phase 3 Features

1. **Predictive Modeling**
   - Forecast facilities costs at different enrollment scenarios
   - Identify break-even enrollment points
   - Model lease renegotiation impact

2. **Benchmarking**
   - Compare to industry standards
   - Compare new vs established schools
   - Geographic cost comparisons

3. **Alert System**
   - Flag schools exceeding facilities % threshold
   - Alert on unusual cost spikes
   - Track against model targets

---

## Appendix: Quick Reference

### Klair MCP Tools

```typescript
// Primary query tool for education data
mcp__klair-mcp__query_education_analytics({
  query: "SELECT ...",
  limit: 100
});

// Get context documentation
mcp__klair-mcp__get_detailed_context({
  context_id: "edu_financials"
});
```

### Account Numbers Reference

| Account | Name | Category |
|---------|------|----------|
| 62200 | Rent | Facilities |
| 62300 | Repairs and Maintenance | Facilities |
| 62301 | IT Maintenance | Facilities |
| 62304 | Security Services | Facilities |
| 62400 | Utilities | Facilities |
| 62500 | Transportation | Facilities |
| 60201 | Contracted Labor - Facilities | Headcount |

### Key Formulas

```typescript
// Fixed cost calculation
fixedCost = rent × 1.0 + utilities × 0.6 + maintenance × 0.7
          + it × 0.8 + landscaping × 1.0 + janitorial × 0.8
          + security × 0.8 + facilitiesLabor × 0.7;

// Per-student at capacity
costPerStudentCapacity = totalFacilitiesCost / capacity;

// % of tuition consumed
pctOfTuition = (totalFacilitiesCost / (enrollment × tuition)) × 100;

// Utilization rate
utilizationRate = currentEnrollment / capacity;
```
