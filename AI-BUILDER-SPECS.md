# Facilities & Capex Cost Analysis - AI Builder Specifications

## Executive Summary

**Purpose**: Analyze real estate and facilities costs as fixed expenses that cannot scale with enrollment, providing decision-ready insights for capacity optimization and new school planning.

**Core Insight**: Unlike headcount or consumables, real estate costs (lease, capex, utilities base load) are "locked in" once committed. This dashboard visualizes what percentage of each school's tuition is consumed by these fixed facility costs and provides actionable recommendations.

**Key Questions**:
1. "At full capacity, what percentage of each tuition dollar goes to facilities?"
2. "Which schools should we fill first before opening new ones?"
3. "What enrollment do we need to reach our 15% facilities target?"

---

## What We Built (Current State)

### Live Dashboard: https://github.com/markevanrozeboom/facilities-capex-analysis

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Deployment**: Vercel-ready
- **Data**: Klair MCP + Draft Unit Economics.xlsx

### Three-Tab Architecture

#### Tab 1: Overview
- **Decision Panel** (Andy-style executive summary)
  - The Question: How to reduce facilities burden to 15%
  - Key Finding: Underutilized schools to fill first
  - Lease Concentration: Top 3 leases = X% of exposure
  - Top 3 Recommended Actions
  - Warning for schools that can't reach 15% target
- **4-Category Cost Cards**: Lease, Fixed Facilities, Variable Facilities, Depreciated Capex
- **Portfolio Breakdown Bar**: Visual proportions by category
- **Category Detail Cards**: Subcategory breakdown with click-to-expand
- **Portfolio KPIs**: Total cost, Excl. Lease, Avg $/student, Utilization
- **School Comparison Table**: Sortable, filterable, with visual breakdown bars
- **Expense Behavior Rules**: Fixed/variable splits for each expense type
- **Key Insights**: Automated findings from the data

#### Tab 2: Segmentation
- **Scenario Slider**: Model 50%-100% capacity impact
  - Total enrollment projection
  - $/student savings
  - % of tuition improvement
  - Efficiency gain calculation
- **By School Type**: Alpha School, MicroSchool, GT/eSports, Low Dollar, Growth
- **By Tuition Tier**: Premium ($50K+), Standard ($35K-$40K), Value ($20K-$25K), Economy (<$20K)
- **Sq Ft Efficiency Analysis**: $/sq ft rankings, efficiency grades

#### Tab 3: Break-Even
- **Break-Even Table**:
  - Students needed for 15%/20% targets
  - Facilities % at 75%/100% capacity
  - Gap to target analysis
  - Red flags for impossible targets
- **New School Economics Calculator**:
  - Input: Annual lease, tuition, other fixed costs %
  - Output: Burden at 15/25/40/60 students
  - Color-coded verdicts

---

## Part 1: The 4-Category Cost Model

### Category Definitions

| Category | Description | Cost Behavior | % of Total (typical) |
|----------|-------------|---------------|---------------------|
| **1. Lease** | Rent commitment | 100% Fixed | 50-60% |
| **2. Fixed Facilities** | Security, IT, Landscaping | 85-100% Fixed | 15-20% |
| **3. Variable Facilities** | Janitorial, Utilities, Repairs | 40-60% Variable | 15-20% |
| **4. Depreciated Capex** | Depreciation/Amortization | 100% Fixed | 5-10% |

### Expense Behavior Rules

| Expense | Category | Cost Type | Fixed % | Variable % | Scaling Rule |
|---------|----------|-----------|---------|------------|--------------|
| Rent | Lease | Fixed | 100% | 0% | Day 1 commitment |
| Security Services | Fixed Facilities | Fixed | 90% | 10% | Base required regardless of enrollment |
| IT Maintenance | Fixed Facilities | Fixed | 85% | 15% | Core infrastructure fixed |
| Landscaping | Fixed Facilities | Fixed | 100% | 0% | Space-driven, not student-driven |
| Janitorial | Variable Facilities | Semi-Variable | 60% | 40% | Base + supplies per student |
| Utilities | Variable Facilities | Semi-Variable | 50% | 50% | Base + marginal usage |
| Repairs | Variable Facilities | Semi-Variable | 60% | 40% | Wear increases with usage |
| Depreciation | Depreciated Capex | Fixed | 100% | 0% | Sunk cost from initial investment |

### Key Metric: Total Excl. Lease

**Definition**: Fixed Facilities + Variable Facilities + Depreciated Capex

**Why it matters**: This is what you spend AFTER signing the lease on day 1. It represents the operational commitment beyond the real estate decision.

---

## Part 2: School Classification

### School Types (from Draft Unit Economics.xlsx)

| Type | Description | Typical Characteristics |
|------|-------------|------------------------|
| **Alpha School** | Full-campus traditional schools | $40K+ tuition, 150+ capacity, high fixed costs |
| **MicroSchool** | Small sites, lean model | $40K tuition, 18-25 capacity, lower absolute costs |
| **GT/eSports** | Specialty programs | $25K tuition, 60-150 capacity, moderate costs |
| **Low Dollar** | Budget-focused schools | $15K tuition, small capacity, lowest tuition |
| **Growth** | Expansion sites | New sites ramping up |

### Tuition Tiers

| Tier | Range | Examples |
|------|-------|----------|
| **Premium** | $50K+ | Santa Barbara, Miami |
| **Standard** | $35K-$40K | Austin K-8, Fort Worth, Charlotte |
| **Value** | $20K-$25K | Sports Academies, GT School, eSports |
| **Economy** | <$20K | Valenta Academy |

---

## Part 3: Data Sources

### Primary: Klair MCP

**Table**: `staging_education.quickbooks_pl_data`

**Key Accounts**:
| Account Code | Account Name | Maps To |
|--------------|--------------|---------|
| 62200 | Rent | Lease |
| 62300 | Repairs and Maintenance | Variable Facilities |
| 62301 | IT Maintenance / Internet | Fixed Facilities |
| 62304 | Security Services | Fixed Facilities |
| 62305 | Landscaping | Fixed Facilities |
| 62400 | Utilities | Variable Facilities |
| 62101 | Depreciation/Amortization | Depreciated Capex |
| 62303 | Janitorial/Toiletries | Variable Facilities |

**Query Pattern**:
```sql
SELECT
  company_id,
  SUM(CASE WHEN account_name = '62200 Rent' THEN amount ELSE 0 END) as lease_rent,
  SUM(CASE WHEN account_name = '62304 Security Services' THEN amount ELSE 0 END) as fixed_security,
  -- etc.
FROM staging_education.quickbooks_pl_data
WHERE account_name IN ('62200 Rent', '62300 Repairs and Maintenance', ...)
GROUP BY company_id
```

### Secondary: Draft Unit Economics.xlsx

**Sheet**: `Rough unit economics`

**Key Columns**:
- School Name
- School Type
- Gross Sq Ft
- Capacity
- Lease Cost
- Total Facilities
- Capex/sq ft, Lease/sq ft, Facilities/sq ft

---

## Part 4: Key Calculations

### Per-Student Metrics

```typescript
// Current enrollment
costPerStudentCurrent = grandTotal / currentEnrollment;

// At capacity
costPerStudentCapacity = grandTotal / capacity;

// % of tuition
pctOfTuitionCurrent = (grandTotal / (currentEnrollment * tuition)) * 100;
pctOfTuitionCapacity = (grandTotal / (capacity * tuition)) * 100;
```

### Break-Even Calculations

```typescript
// Students needed for X% of tuition target
studentsForTarget = grandTotal / (targetPct * tuition);

// Example: Students for 15% target with $500K costs and $40K tuition
studentsFor15Pct = 500000 / (0.15 * 40000) = 83 students
```

### Scenario Modeling

```typescript
// At target utilization
scenarioEnrollment = capacity * targetUtilization;
scenarioRevenue = scenarioEnrollment * tuition;
scenarioPctOfTuition = (grandTotal / scenarioRevenue) * 100;
```

### Sq Ft Efficiency

```typescript
costPerSqft = grandTotal / sqft;
leasePerSqft = leaseCost / sqft;
sqftPerStudent = sqft / currentEnrollment;
```

---

## Part 5: Decision Framework (Andy-Style)

### The Core Question
"Given our current facilities costs, how do we reduce the burden from X% to the 15% target?"

### Decision Logic

```
IF school.utilizationRate < 0.75:
  → "Fill existing capacity first. Adding students is cheaper than new leases."

IF school.breakeven.studentsFor15Pct > school.capacity:
  → "Cannot reach 15% target at current capacity. Consider lease renegotiation or closure."

IF portfolio has underutilized schools AND new school request:
  → "Fill {school} first. It needs only {N} more students to reach break-even."
```

### Lease Concentration Risk
```typescript
top3LeaseExposure = top3Schools.reduce((sum, s) => sum + s.costs.lease.total, 0);
top3LeasePct = (top3LeaseExposure / totalLeaseExposure) * 100;

IF top3LeasePct > 60%:
  → "High concentration risk. Top 3 leases = {X}% of total exposure."
```

---

## Part 6: Visual Design

### Color Scheme

| Category | Primary Color | Tailwind Class |
|----------|---------------|----------------|
| Lease | Blue | `blue-600` / `#1e40af` |
| Fixed Facilities | Violet | `violet-600` / `#7c3aed` |
| Variable Facilities | Teal | `teal-600` / `#0d9488` |
| Depreciated Capex | Red | `red-600` / `#dc2626` |

### Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| Target (≤15%) | Green | `bg-green-100 text-green-800` |
| Acceptable (≤20%) | Blue | `bg-blue-100 text-blue-800` |
| Warning (≤30%) | Amber | `bg-amber-100 text-amber-800` |
| Too High (>30%) | Red | `bg-red-100 text-red-800` |

### Efficiency Grades ($/sq ft)

| Grade | Range | Color |
|-------|-------|-------|
| Excellent | <$50 | Green |
| Good | $50-$80 | Blue |
| Fair | $80-$120 | Amber |
| Poor | >$120 | Red |

---

## Part 7: Component Architecture

### File Structure

```
src/
├── components/
│   └── FacilitiesCapexDashboard.tsx  # Main dashboard (790+ lines)
│       ├── DecisionPanel             # Andy-style executive summary
│       ├── NewSchoolCalculator       # Pre-lease economics tool
│       ├── SegmentTable              # School type / tuition tier groupings
│       ├── ScenarioSlider            # Capacity modeling
│       ├── SqftEfficiencyTable       # $/sq ft rankings
│       ├── BreakevenTable            # Break-even analysis
│       ├── MetricCard                # KPI display
│       ├── CategoryBar               # Visual breakdown
│       ├── SchoolCostBreakdown       # Per-school mini chart
│       └── UtilizationBadge          # Utilization indicator
└── data/
    └── facilitiesCapexData.ts        # Data layer (650+ lines)
        ├── Types: LeaseCategory, FixedFacilitiesCategory, etc.
        ├── klairRawData              # Klair query results
        ├── schoolMetadata            # School classifications
        ├── transformToFourCategories()
        ├── buildSchoolData()
        ├── calculatePortfolioSummary()
        ├── generateInsights()
        ├── calculateScenario()
        ├── aggregateBySchoolType()
        ├── aggregateByTuitionTier()
        └── expenseRules              # Fixed/variable behavior
```

### State Management

```typescript
interface DashboardState {
  // Filters
  schoolTypeFilter: SchoolType | 'all';
  tuitionTierFilter: TuitionTier | 'all';

  // Scenario
  scenarioUtilization: number; // 50-100

  // View
  activeTab: 'overview' | 'segmentation' | 'breakeven';
  selectedSchool: SchoolData | null;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}
```

---

## Part 8: Future Enhancements

### Phase 2 (Planned)
1. **Live Klair Integration**: Replace static data with real-time queries
2. **Lease Terms**: Add expiry dates, renewal terms, early-walk options
3. **Historical Trends**: Year-over-year comparison
4. **Budget vs Actual**: Reconciliation with model

### Phase 3 (Future)
1. **Predictive Modeling**: Forecast costs at different enrollments
2. **New School Planning Tool**: Full economics calculator with location data
3. **Alert System**: Automated flags for threshold violations
4. **Integration with Ops Dashboard**: Link to Wrike facilities status

---

## Appendix: Quick Reference

### Key Formulas

```
Fixed Cost Burden = Lease + Fixed Facilities + Depreciated Capex
Variable Cost = Variable Facilities only

Per-Student = Total / Enrollment
% of Tuition = Total / (Enrollment × Tuition) × 100

Break-Even = Total / (Target% × Tuition)
```

### Target Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Facilities % of Tuition | ≤15% | 15-20% | >20% |
| Utilization | ≥75% | 50-75% | <50% |
| Fixed Cost % | <85% | 85-90% | >90% |

### Account Mapping

| QuickBooks Account | Category | Fixed % |
|-------------------|----------|---------|
| 62200 Rent | Lease | 100% |
| 62101 Depreciation | Depreciated Capex | 100% |
| 62304 Security | Fixed Facilities | 90% |
| 62301 IT Maintenance | Fixed Facilities | 85% |
| 62305 Landscaping | Fixed Facilities | 100% |
| 62300 Repairs | Variable Facilities | 60% |
| 62400 Utilities | Variable Facilities | 50% |
| 62303 Janitorial | Variable Facilities | 60% |

---

*Last Updated: February 2025*
*Repository: https://github.com/markevanrozeboom/facilities-capex-analysis*
