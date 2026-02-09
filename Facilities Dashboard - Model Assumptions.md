# Facilities Dashboard — Model Assumptions & Specifications

**Dashboard:** https://facilities-capex-analysis.vercel.app
**Data Sources:**
- Facilities & Capex Costs (1).xlsx — "Summary - Based on Expense down" sheet (Cols W-Y for budgets)
- 2HL Physical School Models - Current Approved Models.xlsx (staffing, programs, misc formulas)
- Alpha School Economics - Model Assumptions.docx (Alpha-tier staffing rules)

---

## 1. School Categories

| Category | Capacity Range | Schools | Count |
|----------|---------------|---------|-------|
| **Alpha School** | 180+ students | Miami, HS Austin, Austin Spyglass | 3 |
| **Growth Alpha** | 35–125 students | NY, SF, Scottsdale, Charlotte, Palo Alto, Santa Barbara, Piedmont | 7 |
| **MicroSchool** | ≤25 students | Chantilly, Tampa, Fort Worth, Waypoint, Houston, Plano, Lake Forest, Palm Beach, Raleigh, Boston | 10 |
| **Alternative Models** | Any (GT/eSports/Montessorium) | GT School, eSports Austin, Montessorium Brushy Creek | 3 |
| **Low Cost Models** | Any ($15K tuition) | Nova Austin, Nova Bastrop, Alpha Brownsville | 3 |

**Total: 26 schools, 1,955 capacity seats, ~622 currently enrolled (32% utilization)**

---

## 2. Dashboard Structure

Three tabs, all with dark theme, sortable columns, sticky school name column, and school-type filter pills.

### Tab 1: Executive View
- **School-by-School cost table** with per-student/per-sqft toggle (default: capacity)
- Columns: Lease → CapEx (Total, Depr Period, Annual, Per Student) → Lease+Capex → Facilities (Fixed, Variable, Student Svc, Total) → **Total (ex-HC/Programs/Misc)**
- All per-student values show % of tuition underneath
- Collapsible pie charts (Facilities Costs breakdown + Annual Cost Breakdown)
- KPI summary bar: Annual Fac Cost, Current Revenue, Utilization, CapEx Overrun, Revenue at Capacity

### Tab 2: Budget vs Actuals
- **Facilities Budget vs Actual table**: Budget, Budget/Student (% tuition), Actual, Actual/Student (% tuition), Absolute Variance, Var/Student (% tuition)
- **CapEx Budget vs Actual table**: Budget, Budget Depr, Actual, Actual Depr, Absolute Var, Var/Year, Depr Var/Student (% tuition)

### Tab 3: Unit Economics
- **Full P&L per student at capacity**: Revenue → Staffing → Facilities → CapEx Depr → Programs → Misc → Timeback → Model Margin % → **Actual Margin %** → Gap → Driver
- **Break-Even & Target Analysis**: Students to B/E, Students to Target, Margin at Capacity, Verdict
- Deal Evaluation calculator (pre-loaded with Boca Raton)

---

## 3. Tuition Tiers & Margin Targets

| Tier | Tuition | Target Margin |
|------|---------|---------------|
| Premium ($65K+) | $65,000–$75,000 | **20%** |
| Premium ($50K) | $50,000 | **10%** |
| Standard | $40,000 | **5%** |
| Value | $25,000 | **5%** |
| Economy | $15,000 | **5%** |

---

## 4. Staffing Models

All salaries loaded at **1.15×** (benefits/taxes). Verified against all 21 models in the 2HL spreadsheet.

### Alpha Schools ($40K+ Tuition) — 11:1 Guide Ratio

**$40K Tier (Standard):**

| Role | Base | Loaded | Rule |
|------|------|--------|------|
| Head of School | $200K | $230K | Required at ≥100 students |
| Lead Guide | $150K | $172.5K | 1 per ~38 students (ceil), max 4 |
| Guide | $100K | $115K | Fill to 11:1 ratio |
| Admin | $60K | $69K | Always 1 |

**$50K+ Tiers (Premium):**

| Role | Base | Loaded | Rule |
|------|------|--------|------|
| Head of School | $300K | $345K | Required at ≥100 students |
| Lead Guide | $200K | $230K | 1 per ~38 students (ceil), max 4 |
| Guide | $120K | $138K | Fill to 11:1 ratio |
| Admin | $75K | $86.25K | Always 1 |

```
totalGuides = ceil(students / 11)
leadGuides = min(4, max(1, ceil(students / 38)))
regularGuides = totalGuides - leadGuides
staffing = admin + (HoS if ≥100) + leadGuides × leadBase + regularGuides × guideBase
```

### Low Cost Models ($15K Tuition) — 13:1 / 25:1

| Students | Structure | Ratio |
|----------|-----------|-------|
| <100 | 1 Lead Guide ($150K) + Guides ($75K) | 13:1 |
| 100+ | Guides ($75K) + 2 Room Assistants ($40K) + HoS ($150K) + Admin ($60K) | 25:1 |

### Alternative Models ($25K — GT, eSports, Montessorium) — 13:1 / 25:1

| Students | Structure | Ratio |
|----------|-----------|-------|
| <100 | 1 Lead Guide ($150K) + Guides ($100K) | 13:1 |
| 100+ | 2 Leads ($150K) + Guides ($100K) + 2 Room Asst ($60K) + HoS ($200K) + Admin ($60K) | 25:1 |

---

## 5. Per-Student Costs

### Timeback / Software

**Formula:** `min($15,000, max($5,000, tuition × 20%))`

| Tuition | Timeback | % of Tuition |
|---------|----------|-------------|
| $15K | $5,000 | 33% (floor) |
| $25K | $5,000 | 20% |
| $40K | $8,000 | 20% |
| $50K | $10,000 | 20% |
| $65K | $13,000 | 20% |
| $75K | $15,000 | 20% (cap) |

### Programs (Scale-Dependent for Alpha $40K+)

| Tier | ≤50 Students | 51–100 Students | 100+ Students |
|------|-------------|-----------------|---------------|
| **Alpha ($40K+)** | $12,000 | Linear → $8,500 | $8,500 |
| **Alternative ($25K)** | $2,500 | $2,500 | $2,500 |
| **Low Cost ($15K)** | $1,250 | $1,250 | $1,250 |

Formula for Alpha 51–100 range: `$12,000 - $3,500 × (students - 50) / 50`

### Misc Expense (Computers, Supplies)

| Students | Misc/Student | Notes |
|----------|-------------|-------|
| ≤50 | $3,500 | Small school overhead |
| 51–100 | Linear → $1,500 | Transition |
| 100+ | $1,500 | Economies of scale |

**Exception:** Low Cost ($15K) is flat at $1,500 regardless of enrollment.

---

## 6. Facilities Budget

The model assumes specific per-student facility costs from Column W of the spreadsheet:

| Tuition | Model Budget/Student | Source |
|---------|---------------------|--------|
| $15K | Per school (Col W) | Approved model |
| $25K | Per school (Col W) | Approved model |
| $40K | Per school (Col W) | Approved model |
| $50K | Per school (Col W) | Approved model |
| $65K | Per school (Col W) | Approved model |

**Actual facility costs** = Lease + Fixed Facilities + Variable Facilities + Student Services (categories 1-4), from year-end expense data, divided by capacity.

---

## 7. CapEx Budget

### Formula
```
Approved CapEx Budget = rate_per_student × capacity × depreciation_period
```

| School Type | Rate/Student/Year |
|-------------|------------------|
| Alpha School | $1,000 |
| Growth Alpha | $750 |
| MicroSchool | $500 |
| Alternative | $500 |
| Low Cost | $500 |

### Depreciation
- **Period:** Derived from data: `CapEx Buildout ÷ Annual Depreciation`
- Most schools show 10-year straight-line; some (SF, Boston, Palo Alto, Fort Worth, etc.) show 2-year based on lease alignment
- **Annual Depreciation** = actual amount from expense data (totalIncCapex − totalExcCapex)

---

## 8. Unit Economics P&L Model

```
Revenue          = Tuition × Capacity

Costs/Student:
  Staffing       = f(tuition_tier, students)     [Section 4]
  Facilities     = Actual year-end costs          [Categories 1-4]
  CapEx Depr.    = Actual annual depreciation     [Category 5]
  Programs       = f(tuition_tier, students)      [Section 5]
  Misc           = f(students)                    [Section 5]
  Timeback       = min($15K, max($5K, 20%×tuition)) [Section 5]

Margin           = Revenue - Total Costs
Margin %         = Margin / Revenue × 100

Model Margin %   = Same formula but using BUDGETED facility costs (Col W)
Actual Margin %  = Using ACTUAL facility costs
Gap              = Actual - Model (almost always driven by facility overspend)
```

### Break-Even Iteration
For each school, iterates from 1 to 2× capacity:
- **Students to B/E:** First enrollment where Margin ≥ 0
- **Students to Target:** First enrollment where Margin % ≥ tier target
- If exceeds capacity → **structural problem**

---

## 9. Facilities Cost Categories

| # | Category | Subcategories | Behavior |
|---|----------|--------------|----------|
| 1 | **Lease** | Rent | 100% Fixed |
| 2 | **Fixed Facilities** | Security, IT Maintenance, Landscaping | ~85-100% Fixed |
| 3 | **Variable Facilities** | Janitorial, Utilities, Repairs | ~50-60% Fixed |
| 4 | **Student Services** | Food Services, Transportation | ~20-30% Fixed |
| 5 | **Annual Depreciation** | CapEx amortization | 100% Fixed |
| 6 | **CapEx Buildout** | One-time capital expenditure | One-time |

### Dashboard Groupings
- **Executive View:** Lease | CapEx group | Lease+Capex | Facilities group (Fixed, Var, Svc, Total) | Total (ex-HC)
- **Budget vs Actuals:** Facilities (Budget/Actual/Variance) + CapEx (Budget/Actual/Variance)
- **Unit Economics:** Full P&L with all cost lines + model vs actual margin comparison

---

## 10. Key Model Rules

1. **HoS at 100 students** — creates a margin dip until ~180 students absorb the cost
2. **4 Lead Guides max** — capped regardless of enrollment above 150
3. **CapEx budget is formula-driven** — rate × capacity × depr period
4. **Programs decline with scale** — $12K at ≤50 → $8.5K at 100+ (Alpha tiers only)
5. **Misc declines with scale** — $3.5K → $1.5K past 100 students (except Low Cost = flat $1.5K)
6. **Timeback = 20% of tuition** with $5K floor and $15K cap
7. **All values dynamic** — no hardcoded percentages; everything from inputs
8. **Facility budget from Col W** — per-school approved model number
9. **Different staffing models by tier** — Alpha (11:1), Low Cost/Alternative (13:1→25:1)

---

## 11. Data Sources

| Data | Source | Sheet/Column |
|------|--------|-------------|
| Actual costs (categories 1-6) | Facilities & Capex Costs (1).xlsx | Summary - Based on Expense down |
| Facility budget/student | Same file | Column W |
| CapEx budget/student | Same file | Column X |
| Total budget/student | Same file | Column Y (= W + X) |
| Enrollment & capacity | Schools Data Sheet.xlsx | School Data |
| Staffing formulas | 2HL Physical School Models.xlsx | Models + Params sheets |
| Programs/Misc formulas | Same file | Models sheet (row 19, 30, 31) + Params (Other Spend Table) |

**Data vintage:** Year-end actuals. Static data, not live-connected.

---

*Last Updated: February 9, 2026*
*Dashboard: https://facilities-capex-analysis.vercel.app*
