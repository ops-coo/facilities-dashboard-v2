# Facilities Dashboard — What's In The Model

**Dashboard:** https://facilities-capex-analysis.vercel.app
**Bottom line:** The approved model underestimates what it costs to run these buildings. This dashboard shows exactly where and by how much.

---

## The Portfolio

26 schools. 1,955 capacity seats. ~622 enrolled. 32% utilization.

| Type | Schools | Capacity | What they are |
|------|---------|----------|---------------|
| **Alpha School** | 3 | 602 | Miami, HS Austin, Spyglass — the big ones |
| **Growth Alpha** | 7 | 499 | NY, SF, Scottsdale, Charlotte, Palo Alto, Santa Barbara, Piedmont |
| **MicroSchool** | 10 | 236 | ≤25 seats each — Chantilly, Tampa, Fort Worth, Waypoint, Houston, Plano, Lake Forest, Palm Beach, Raleigh, Boston |
| **Alternative** | 3 | 285 | GT School, eSports Austin, Montessorium |
| **Low Cost** | 3 | 325 | Nova Austin, Nova Bastrop, Brownsville — $15K tuition |

---

## The 4 Tabs

Everything grouped by school type. Click a type header → schools expand underneath. Click a school → detail drawer opens.

### 1. Executive View
- Cost breakdown per student (or per sqft, or at current enrollment — toggle at top)
- Columns: Lease → CapEx (total, depr period, annual, per student) → Lease+Capex → Facilities (Fixed, Variable, Student Svc, Total) → **Total ex-HC**
- All values show % of tuition underneath
- KPI bar at bottom: Annual Fac Cost, Revenue, Utilization, CapEx Overrun, Revenue at Capacity

### 2. Budget vs Actuals
- **Variance Source chart** — by school type, click to drill in. Shows Facilities OpEx variance (red) vs CapEx Depr variance (gray). Proves OpEx is the problem.
- **Facilities — Budget vs Actual table** — model $/student vs actual $/student, variance. Per-student summary by type underneath.
- **CapEx — Model vs Actual table** — model buildout vs actual, depreciation variance. Per-seat summary by type underneath.

### 3. Unit Economics
- **Model vs Actual Margin chart** — by school type, click to drill in. Blue = what the model predicted. Green/amber/red = actual margin at capacity.
- **Target Achievability** — table by tuition tier showing avg margin, target, gap, pass rate. Click tier to see schools.
- **Full P&L table** — Revenue, Staffing, Facilities, CapEx Depr, Programs, Misc, Timeback → Model Margin % → **Actual Margin %** → Gap → Driver
- **Break-Even & Target** — students needed for breakeven and target margin

### 4. Summary
- **Model vs Reality** — 5 category bars (click to expand schools). The approved model said X. Reality is Y.
- **Where the Money Goes** — subcategory spend ranked, with per-student breakdown underneath
- **Cost/Sq Ft by Category** — stacked bar by school type + industry comps table (vs Premium K-12, Avg Private, Charter benchmarks)
- **CapEx Cash Exposure** — total buildout by school type, click to see individual schools. Color-coded by magnitude.
- **Cost Structure by School Type** — stacked bar showing what drives cost in each segment
- **Controllability Donut** — what's locked in (lease + depr) vs what you can negotiate
- **Key Insights** — three numbered takeaways

---

## Tuition Tiers & Margin Targets

| Tier | Tuition | Target | Logic |
|------|---------|--------|-------|
| Premium ($65K+) | $65K–$75K | **20%** | High tuition = high expectations |
| Premium ($50K) | $50K | **10%** | Mid-premium |
| Standard | $40K | **5%** | Baseline |
| Value | $25K | **5%** | Same target, less room |
| Economy | $15K | **5%** | Tight margins by design |

If a school can't hit its target at 100% capacity → **structural problem** with the cost base.

---

## Staffing — The Formulas

All salaries loaded at **1.15×** (benefits/taxes).

### Alpha ($40K+ Tuition) — 11:1 Ratio

```
totalGuides = ceil(students / 11)
leadGuides = min(4, max(1, ceil(students / 38)))
regularGuides = totalGuides - leadGuides
staffing = admin + (HoS if ≥100) + leadGuides × leadBase + regularGuides × guideBase
```

| | $40K Tier | $50K+ Tier |
|--|-----------|-----------|
| Head of School | $200K (≥100 students) | $300K (≥100 students) |
| Lead Guide | $150K | $200K |
| Guide | $100K | $120K |
| Admin | $60K | $75K |

**Key rule:** HoS kicks in at 100 students → margin dip until ~180 students absorb it.

### Low Cost ($15K) — 13:1 small / 25:1 large
- <100: 1 Lead ($150K) + Guides ($75K) at 13:1
- 100+: Guides ($75K) + 2 Room Asst ($40K) + HoS ($150K) + Admin ($60K) at 25:1

### Alternative ($25K) — 13:1 small / 25:1 large
- <100: 1 Lead ($150K) + Guides ($100K) at 13:1
- 100+: 2 Leads ($150K) + Guides ($100K) + 2 Room Asst ($60K) + HoS ($200K) + Admin ($60K) at 25:1

---

## Per-Student Costs — Not Facilities

These are the OTHER cost lines. They're formula-driven, not the problem.

**Timeback:** `min($15K, max($5K, tuition × 20%))` — 20% of tuition with floor and cap.

**Programs (Alpha $40K+ only, scale-dependent):**
- ≤50 students: $12,000
- 51–100: linear decline → $8,500
- 100+: $8,500
- Alternative/Low Cost: flat $2,500/$1,250

**Misc:** $3,500 at ≤50 students → $1,500 at 100+ (Low Cost always $1,500)

---

## Facilities — The 6 Categories

This is where the money goes. This is the problem.

| # | Category | What's in it | Fixed or Variable |
|---|----------|-------------|-------------------|
| 1 | **Lease** | Rent | 100% Fixed — locked day 1 |
| 2 | **Fixed Facilities** | Security, IT, Landscaping | ~85-100% Fixed |
| 3 | **Variable Facilities** | Janitorial, Utilities, Repairs | ~50-60% Fixed |
| 4 | **Student Services** | Food Services, Transportation | ~20-30% Fixed |
| 5 | **Annual Depreciation** | CapEx amortization | 100% Fixed |
| 6 | **CapEx Buildout** | One-time buildout cash | One-time |

**The model budget** for facilities comes from Column W of the spreadsheet — per-school approved numbers.
**Actual costs** = categories 1-4 from year-end expense data.
**The gap** between model and actual is where the economics break.

---

## CapEx Model

```
Approved CapEx = rate_per_student × capacity × depreciation_period
```

| School Type | Rate/Student/Year |
|-------------|------------------|
| Alpha School | $1,000 |
| Growth Alpha | $750 |
| MicroSchool | $500 |
| Alternative | $500 |
| Low Cost | $500 |

**The real issue:** The formula produces reasonable numbers for established schools (~$25K buildouts). But new Growth/Alpha locations are spending $400K–$1.8M in actual cash. Piedmont: $1.77M. Palo Alto: $1.42M. The model didn't anticipate this.

**Depreciation:** Derived from data (`buildout ÷ annual depreciation`). Most schools 10-year straight-line. Some (SF, Boston, Palo Alto) show 2-year aligned to lease term.

---

## Unit Economics — How It All Fits

```
Revenue         = Tuition × Capacity

Costs/Student:
  Staffing      = f(tuition_tier, students)       ← formula, not the problem
  Facilities    = Actual year-end costs            ← THIS IS THE PROBLEM
  CapEx Depr    = Actual annual depreciation       ← generally controlled
  Programs      = f(tuition_tier, students)        ← formula
  Misc          = f(students)                      ← formula
  Timeback      = min($15K, max($5K, 20%×tuition)) ← formula

Margin          = Revenue - Total Costs
Margin %        = Margin / Revenue × 100

Model Margin %  = Same formula, BUDGETED facility costs (Col W)
Actual Margin % = Same formula, ACTUAL facility costs
Gap             = Actual - Model → almost always negative, driven by facility overspend
```

### Break-Even
For each school, iterate from 1 to 2× capacity:
- **B/E:** First enrollment where Margin ≥ 0
- **Target:** First enrollment where Margin % ≥ tier target
- If target students > capacity → you can't get there. Cost structure is wrong.

---

## What Matters

1. **Facilities OpEx exceeds the approved model** — security, food services, transportation are the biggest lines. The model was optimistic.
2. **CapEx cash exposure is bimodal** — old MicroSchools built for $25K; new locations cost $400K–$1.8M. The per-seat rate formula doesn't capture this.
3. **Most schools can't hit target margin at capacity** — the cost base is structurally too high. Not a utilization problem. A cost problem.
4. **~57% of facilities cost is locked in** (lease + depreciation). The controllable portion is facilities operations + student services. That's where vendor renegotiation matters.

---

## Data Sources

| Data | Source | Where |
|------|--------|-------|
| Actual costs (categories 1-6) | Facilities & Capex Costs (1).xlsx | Summary - Based on Expense down |
| Facility model/student | Same file | Column W |
| CapEx model/student | Same file | Column X |
| Total model/student | Same file | Column Y (= W + X) |
| Enrollment & capacity | Schools Data Sheet.xlsx | School Data |
| Staffing formulas | 2HL Physical School Models.xlsx | Models + Params sheets |
| Programs/Misc formulas | Same file | Models sheet (row 19, 30, 31) + Params |
| Industry benchmarks | NCES Private School Universe Survey, BOMA Experience Exchange Report | External |

**Data vintage:** Year-end actuals. Static snapshot, not live-connected.

---

*Last Updated: February 10, 2026*
*Dashboard: https://facilities-capex-analysis.vercel.app*
