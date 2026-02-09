/**
 * Facilities & Capex Cost Analysis Dashboard
 *
 * Andy-style decision tool: Revenue alongside costs, health scoring,
 * marginal economics, and controllability splits.
 *
 * 6-CATEGORY VIEW:
 * 1. Lease - Rent commitment (fixed, day 1)
 * 2. Fixed Facilities Cost - Security, IT, Landscaping (doesn't scale)
 * 3. Variable Facilities Cost - Janitorial, Utilities, Repairs (scales with students)
 * 4. Student Services - Food Services, Transportation (scales with students)
 * 5. Annual Depreciation - Depreciation/Amortization
 * 6. CapEx Buildout - One-time capital expenditure (shown separately)
 */

import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import {
  buildSchoolData,
  calculatePortfolioSummary,
  calculateUnitEconomics,
  getTargetPct,
  schoolTypeLabels,
  tuitionTierLabels,
  presetLabels,
  type SchoolData,
  type PortfolioSummary,
  type SchoolType,
  type TuitionTier,
  type ExpensePreset,
  type HealthScore,
} from '../data/facilitiesCapexData';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const formatCurrency = (val: number): string => {
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

// Sort helpers removed — using inline sort state instead

// (MetricCard removed — replaced by inline layouts)

// CategoryBar, SchoolCostBreakdown, UtilizationBadge removed — replaced by pie charts + category table

const HealthBadge: React.FC<{ score: HealthScore; verdict: string }> = ({ score, verdict }) => {
  const config: Record<HealthScore, { bg: string; dot: string }> = {
    green: { bg: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
    yellow: { bg: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
    red: { bg: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
    gray: { bg: 'bg-gray-100 text-slate-400', dot: 'bg-gray-400' },
  };
  const { bg, dot } = config[score];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${bg}`} title={verdict}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {verdict}
    </span>
  );
};

// ============================================================================
// EXPENSE PRESET TOGGLE
// ============================================================================

const PresetToggle: React.FC<{
  preset: ExpensePreset;
  onChange: (preset: ExpensePreset) => void;
}> = ({ preset, onChange }) => {
  return (
    <div className="flex items-center gap-2 bg-slate-600/50 rounded-lg p-1">
      <button
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          preset === 'dashboard'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-300 hover:text-white'
        }`}
        onClick={() => onChange('dashboard')}
      >
        {presetLabels.dashboard}
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          preset === 'expense-report'
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-300 hover:text-white'
        }`}
        onClick={() => onChange('expense-report')}
      >
        {presetLabels['expense-report']}
      </button>
    </div>
  );
};

// ============================================================================
// OPERATING STATUS TOGGLE
// ============================================================================

type OperatingFilter = 'all' | 'operating' | 'pre-opening';

const OperatingToggle: React.FC<{
  value: OperatingFilter;
  onChange: (val: OperatingFilter) => void;
}> = ({ value, onChange }) => {
  const options: { id: OperatingFilter; label: string }[] = [
    { id: 'all', label: 'All Schools' },
    { id: 'operating', label: 'Operating' },
    { id: 'pre-opening', label: 'Pre-Opening' },
  ];
  return (
    <div className="flex items-center gap-1 bg-slate-600/50 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === opt.id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-300 hover:text-white'
          }`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};


// ============================================================================
// CONTROLLABILITY SPLIT (replaces Fixed Cost Warning)
// ============================================================================

// ControllabilitySplit removed — replaced with pie chart in overview

// ============================================================================
// MARGINAL ECONOMICS TABLE
// ============================================================================
// NEW SCHOOL ECONOMICS CALCULATOR
// ============================================================================

const NewSchoolCalculator: React.FC<{ summary?: PortfolioSummary }> = ({ summary }) => {
  const [dealName, setDealName] = React.useState('Boca Raton — 2200 NW 5th Ave');
  const [leaseAmount, setLeaseAmount] = React.useState(180000);
  const [tuition, setTuition] = React.useState(50000);
  const [capacity, setCapacity] = React.useState(40);
  const [sqft, setSqft] = React.useState(8000);
  const [fixedFacilitiesPct, setFixedFacilitiesPct] = React.useState(25);
  const [capexBuildout, setCapexBuildout] = React.useState(250000);
  const [amortYears, setAmortYears] = React.useState(5);
  const [leaseTerm, setLeaseTerm] = React.useState(5);
  const [earlyWalkYears, setEarlyWalkYears] = React.useState(2);

  const annualDepreciation = capexBuildout / amortYears;
  const fixedFacCost = leaseAmount * (fixedFacilitiesPct / 100);
  const totalFixed = leaseAmount + fixedFacCost + annualDepreciation;
  const totalCommitment = leaseAmount * leaseTerm + capexBuildout;
  const earlyWalkExposure = leaseAmount * earlyWalkYears + capexBuildout;
  const leasePerSqft = sqft > 0 ? leaseAmount / sqft : 0;
  const targetPctForTuition = tuition >= 65000 ? 20 : tuition > 40000 ? 10 : 5;

  const scenarios = [
    { students: Math.floor(capacity * 0.25), label: `${Math.floor(capacity * 0.25)} (25%)` },
    { students: Math.floor(capacity * 0.50), label: `${Math.floor(capacity * 0.50)} (50%)` },
    { students: Math.floor(capacity * 0.75), label: `${Math.floor(capacity * 0.75)} (75%)` },
    { students: capacity, label: `${capacity} (100%)` },
  ].map((s) => {
    const revenue = s.students * tuition;
    const costPerStudent = s.students > 0 ? totalFixed / s.students : 0;
    const pctOfTuition = s.students > 0 ? (totalFixed / revenue) * 100 : 0;
    const margin = revenue - totalFixed;
    return { ...s, revenue, costPerStudent, pctOfTuition, margin };
  });

  // Portfolio impact
  const portfolioCurrentCost = summary?.grandTotal ?? 0;
  const portfolioCurrentEnrollment = summary?.totalEnrollment ?? 0;
  const portfolioCurrentCapacity = summary?.totalCapacity ?? 0;
  const newPortfolioCost = portfolioCurrentCost + totalFixed;
  const atCapacityRevenue = capacity * tuition;
  const newPortfolioRevenueAtCap = (summary?.totalRevenueAtCapacity ?? 0) + atCapacityRevenue;
  const newPortfolioCapacity = portfolioCurrentCapacity + capacity;
  const newFacPctAtCapacity = newPortfolioRevenueAtCap > 0 ? (newPortfolioCost / newPortfolioRevenueAtCap) * 100 : 0;

  // Comparable check: Alpha Palm Beach
  const breakEvenStudents = Math.ceil(totalFixed / (targetPctForTuition / 100 * tuition));
  const canReachTarget = breakEvenStudents <= capacity;

  return (
    <div className="table-card rounded-xl overflow-hidden mb-6">
      <div className="px-5 py-4 bg-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-lg">Deal Evaluation</h3>
            <p className="text-sm text-slate-300 mt-0.5">
              Before signing: What does this deal cost the portfolio? What&apos;s the exit?
            </p>
          </div>
          <div className="text-xs text-slate-500">Andy rule: no lease without a model</div>
        </div>
      </div>

      <div className="p-5">
        {/* Deal name */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-400 mb-1">Deal Name / Address</label>
          <input type="text" value={dealName} onChange={(e) => setDealName(e.target.value)} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white font-medium" placeholder="e.g. Boca Raton — 2200 NW 5th Ave" />
        </div>

        {/* Input grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
        <div>
            <label className="block text-xs text-slate-400 mb-1">Annual Lease</label>
          <input type="number" value={leaseAmount} onChange={(e) => setLeaseAmount(Number(e.target.value))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={10000} />
        </div>
        <div>
            <label className="block text-xs text-slate-400 mb-1">Tuition</label>
          <input type="number" value={tuition} onChange={(e) => setTuition(Number(e.target.value))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={5000} />
        </div>
        <div>
            <label className="block text-xs text-slate-400 mb-1">Capacity (seats)</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value)))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={5} min={1} />
        </div>
        <div>
            <label className="block text-xs text-slate-400 mb-1">Sq Ft</label>
            <input type="number" value={sqft} onChange={(e) => setSqft(Number(e.target.value))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={500} />
        </div>
        <div>
            <label className="block text-xs text-slate-400 mb-1">Other Fixed (% of lease)</label>
          <input type="number" value={fixedFacilitiesPct} onChange={(e) => setFixedFacilitiesPct(Number(e.target.value))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={5} />
        </div>
        <div>
            <label className="block text-xs text-slate-400 mb-1">CapEx Buildout</label>
          <input type="number" value={capexBuildout} onChange={(e) => setCapexBuildout(Number(e.target.value))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={25000} />
        </div>
        <div>
            <label className="block text-xs text-slate-400 mb-1">Amort. Years</label>
          <input type="number" value={amortYears} onChange={(e) => setAmortYears(Math.max(1, Number(e.target.value)))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={1} min={1} />
        </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Lease Term (yrs)</label>
            <input type="number" value={leaseTerm} onChange={(e) => setLeaseTerm(Math.max(1, Number(e.target.value)))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={1} min={1} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Early Walk (yrs)</label>
            <input type="number" value={earlyWalkYears} onChange={(e) => setEarlyWalkYears(Math.max(0, Number(e.target.value)))} className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-800 text-white" step={1} min={0} />
        </div>
      </div>

        {/* Commitment & Risk KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <div className="text-xs text-blue-300 font-medium">Annual Fixed Cost</div>
            <div className="text-lg font-bold text-blue-900">{formatCurrency(totalFixed)}</div>
          </div>
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-center">
            <div className="text-xs text-amber-300 font-medium">Total Commitment</div>
            <div className="text-lg font-bold text-amber-900">{formatCurrency(totalCommitment)}</div>
            <div className="text-[10px] text-amber-600">{leaseTerm}yr lease + buildout</div>
          </div>
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
            <div className="text-xs text-red-400 font-medium">Early Walk Exposure</div>
            <div className="text-lg font-bold text-red-900">{formatCurrency(earlyWalkExposure)}</div>
            <div className="text-[10px] text-red-400">{earlyWalkYears}yr lease + buildout</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-600 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 font-medium">Lease / Sq Ft</div>
            <div className="text-lg font-bold text-slate-900">${Math.round(leasePerSqft)}</div>
            <div className="text-[10px] text-slate-400">Portfolio avg: ${summary ? Math.round(summary.avgLeasePerSqft) : '—'}</div>
          </div>
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
            <div className="text-xs text-green-400 font-medium">Break-Even</div>
            <div className="text-lg font-bold text-green-900">{breakEvenStudents} students</div>
            <div className={`text-[10px] ${canReachTarget ? 'text-green-400' : 'text-red-400'}`}>
              for {targetPctForTuition}% target | {canReachTarget ? 'Achievable' : 'EXCEEDS CAPACITY'}
            </div>
          </div>
      </div>

        {/* Enrollment Scenarios */}
        <table className="w-full text-sm mb-6">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Enrollment</th>
              <th className="px-3 py-2 text-right">Revenue</th>
            <th className="px-3 py-2 text-right">$/Student</th>
            <th className="px-3 py-2 text-right">% of Tuition</th>
              <th className="px-3 py-2 text-right">Margin</th>
            <th className="px-3 py-2 text-left">Verdict</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {scenarios.map((s) => (
            <tr key={s.students}>
              <td className="px-3 py-2">{s.label}</td>
                <td className="px-3 py-2 text-right text-green-400">{formatCurrency(s.revenue)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(s.costPerStudent)}</td>
              <td className="px-3 py-2 text-right font-medium">{s.pctOfTuition.toFixed(1)}%</td>
                <td className={`px-3 py-2 text-right font-medium ${s.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.margin >= 0 ? '+' : ''}{formatCurrency(s.margin)}
                </td>
              <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    s.pctOfTuition <= targetPctForTuition
                      ? 'bg-green-100 text-green-800'
                      : s.pctOfTuition <= targetPctForTuition * 1.5
                        ? 'bg-blue-100 text-blue-800'
                        : s.pctOfTuition <= targetPctForTuition * 2.5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                  }`}>
                    {s.pctOfTuition <= targetPctForTuition ? 'At Target' : s.pctOfTuition <= targetPctForTuition * 1.5 ? 'Acceptable' : s.pctOfTuition <= targetPctForTuition * 2.5 ? 'Warning' : 'Too High'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

        {/* Portfolio Impact */}
        {summary && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-3">Portfolio Impact</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-400">Current Portfolio Cost</div>
                <div className="font-medium">{formatCurrency(portfolioCurrentCost)}</div>
                <div className="text-xs text-slate-500 mt-1">After this deal</div>
                <div className="font-bold">{formatCurrency(newPortfolioCost)}</div>
                <div className="text-xs text-red-500">+{formatCurrency(totalFixed)} ({(totalFixed / portfolioCurrentCost * 100).toFixed(1)}%)</div>
      </div>
              <div>
                <div className="text-xs text-slate-400">Capacity</div>
                <div className="font-medium">{portfolioCurrentCapacity} seats</div>
                <div className="text-xs text-slate-500 mt-1">After this deal</div>
                <div className="font-bold">{newPortfolioCapacity} seats</div>
                <div className="text-xs text-blue-500">+{capacity} seats</div>
      </div>
              <div>
                <div className="text-xs text-slate-400">Current Utilization</div>
                <div className="font-medium">{summary.avgUtilization.toFixed(0)}%</div>
                <div className="text-xs text-slate-500 mt-1">After (0 enrolled)</div>
                <div className="font-bold text-red-400">{newPortfolioCapacity > 0 ? ((portfolioCurrentEnrollment / newPortfolioCapacity) * 100).toFixed(0) : 0}%</div>
                <div className="text-xs text-red-500">Diluted by empty seats</div>
    </div>
              <div>
                <div className="text-xs text-slate-400">Fac % at Full Capacity</div>
                <div className="font-medium">{summary.totalRevenueAtCapacity > 0 ? ((portfolioCurrentCost / summary.totalRevenueAtCapacity) * 100).toFixed(0) : 0}% today</div>
                <div className="text-xs text-slate-500 mt-1">With this school at cap</div>
                <div className="font-bold">{newFacPctAtCapacity.toFixed(0)}%</div>
      </div>
      </div>

            {/* Decision Box */}
            <div className={`mt-4 p-3 rounded-lg border ${canReachTarget ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
              <div className="font-medium text-sm">
                {canReachTarget ? (
                  <>&#9989; This deal can reach the {targetPctForTuition}% target at {breakEvenStudents}/{capacity} capacity. Early-walk exposure: {formatCurrency(earlyWalkExposure)}.</>
                ) : (
                  <>&#10060; This deal CANNOT reach the {targetPctForTuition}% target — needs {breakEvenStudents} students but capacity is only {capacity}. Do not sign without renegotiating lease or reducing scope.</>
                )}
        </div>
              <div className="text-xs text-slate-400 mt-2">
                Existing portfolio has {summary.totalCapacity - summary.totalEnrollment} empty seats at {summary.avgUtilization.toFixed(0)}% utilization. Consider filling those first.
        </div>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

const FacilitiesCapexDashboard: React.FC = () => {
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  // Filters
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<SchoolType | 'all'>('all');
  const [tuitionTierFilter, setTuitionTierFilter] = useState<TuitionTier | 'all'>('all');
  const [operatingFilter, setOperatingFilter] = useState<OperatingFilter>('all');

  // Expense preset
  const [expensePreset, setExpensePreset] = useState<ExpensePreset>('dashboard');

  // (Scenario slider removed — was on old segmentation tab)

  // View mode
  const [activeTab, setActiveTab] = useState<'summary' | 'overview' | 'segmentation' | 'breakeven'>('summary');
  const [overviewBasis, setOverviewBasis] = useState<'current' | 'capacity' | 'sqft'>('capacity');
  const [showCharts, setShowCharts] = useState(false);
  const [expandedType, setExpandedType] = useState<SchoolType | null>(null);
  const [expandedVarianceType, setExpandedVarianceType] = useState<SchoolType | null>(null);
  const [expandedMarginType, setExpandedMarginType] = useState<SchoolType | null>(null);
  const [expandedTier, setExpandedTier] = useState<TuitionTier | null>(null);
  const [expandedCapexType, setExpandedCapexType] = useState<SchoolType | null>(null);

  // Sort state for each table
  const [overviewSort, setOverviewSort] = useState<{key: string; dir: 'asc'|'desc'}>({key: 'total', dir: 'desc'});
  // Additional sort states can be added per tab as needed

  const toggleSort = (setter: React.Dispatch<React.SetStateAction<{key:string;dir:'asc'|'desc'}>>) => (key: string) => {
    setter(prev => prev.key === key ? {key, dir: prev.dir === 'asc' ? 'desc' : 'asc'} : {key, dir: 'desc'});
  };

  const allSchools = useMemo(() => buildSchoolData(), []);

  // Apply filters
  const schools = useMemo(() => {
    return allSchools.filter((s) => {
      if (schoolTypeFilter !== 'all' && s.schoolType !== schoolTypeFilter) return false;
      if (tuitionTierFilter !== 'all' && s.tuitionTier !== tuitionTierFilter) return false;
      if (operatingFilter === 'operating' && !s.isOperating) return false;
      if (operatingFilter === 'pre-opening' && s.isOperating) return false;
      return true;
    });
  }, [allSchools, schoolTypeFilter, tuitionTierFilter, operatingFilter]);

  const summary = useMemo(() => calculatePortfolioSummary(schools), [schools]);

  // (Segmentation + scenario removed — replaced with Budget vs Actuals tab)

  // Schools sorted by total cost descending
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => b.costs.grandTotal - a.costs.grandTotal);
  }, [schools]);

  // Headline insight
  const costVsRevenuePct = summary.totalRevenueCurrent > 0
    ? ((summary.grandTotal / summary.totalRevenueCurrent) * 100).toFixed(0)
    : '0';
  const emptySeats = summary.totalCapacity - summary.totalEnrollment;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-5 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start">
        <div>
              <h1 className="text-2xl font-bold text-white">Facilities & Capex Analysis</h1>
              <p className="text-sm text-slate-400 mt-1">{summary.totalSchools} schools | Year-end actuals | {summary.totalSqft.toLocaleString()} sq ft</p>
        </div>
            <div className="flex items-center gap-3">
              <OperatingToggle value={operatingFilter} onChange={setOperatingFilter} />
              <select value={schoolTypeFilter} onChange={(e) => setSchoolTypeFilter(e.target.value as SchoolType | 'all')} className="border border-slate-600 rounded px-2 py-1.5 text-xs bg-slate-700 text-white">
                <option value="all">All Types</option>
                {Object.entries(schoolTypeLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
              </select>
              <select value={tuitionTierFilter} onChange={(e) => setTuitionTierFilter(e.target.value as TuitionTier | 'all')} className="border border-slate-600 rounded px-2 py-1.5 text-xs bg-slate-700 text-white">
                <option value="all">All Tiers</option>
                {Object.entries(tuitionTierLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
              </select>
              <PresetToggle preset={expensePreset} onChange={setExpensePreset} />
          </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-700 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {([
            { id: 'summary', label: 'Summary', icon: '\u26a1' },
            { id: 'overview', label: 'Executive View', icon: '\ud83d\udcca' },
            { id: 'segmentation', label: 'Budget vs Actuals', icon: '\ud83d\udccb' },
            { id: 'breakeven', label: 'Unit Economics', icon: '\ud83c\udfaf' },
          ] as const).map((tab) => (
              <button
              key={tab.id}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-400 text-white bg-slate-600/50'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-slate-400'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
            </div>
        </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

      {/* SUMMARY TAB */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {(() => {
            // Schools at target count
            const schoolsAtTarget = schools.filter(s => {
              const facTotal = s.costs.lease.total + s.costs.fixedFacilities.total +
                s.costs.variableFacilities.total + s.costs.studentServices.total;
              const ue = calculateUnitEconomics(s.tuition, s.capacity, facTotal, s.costs.annualDepreciation.total);
              return ue.marginPct >= getTargetPct(s.tuition);
            }).length;

            // Portfolio facilities budget vs actual
            const portfolioFacBudget = schools.reduce((s, sc) => s + sc.budget.modelFacPerStudent * sc.capacity, 0);
            const portfolioFacActual = summary.totalLease + summary.totalFixedFacilities +
              summary.totalVariableFacilities + summary.totalStudentServices;
            const portfolioOverrun = portfolioFacActual - portfolioFacBudget;
            const portfolioCap = Math.max(summary.totalCapacity, 1);
            const avgOverrunPS = portfolioOverrun / portfolioCap;
            const overrunPct = portfolioFacBudget > 0 ? (portfolioOverrun / portfolioFacBudget * 100).toFixed(0) : '0';

            // Model vs Actual — type-level summary only (click to drill in)
            const typeOrder: SchoolType[] = ['alpha-school', 'growth-alpha', 'microschool', 'alternative', 'low-dollar'];
            const typeSummaryData = typeOrder.map(type => {
              const typeSchools = schools.filter(s => s.schoolType === type);
              if (typeSchools.length === 0) return null;
              const totalCap = Math.max(typeSchools.reduce((s, sc) => s + sc.capacity, 0), 1);
              const avgModel = typeSchools.reduce((s, sc) => s + sc.budget.modelFacPerStudent * sc.capacity, 0) / totalCap;
              const avgActual = typeSchools.reduce((s, sc) =>
                s + sc.costs.lease.total + sc.costs.fixedFacilities.total +
                sc.costs.variableFacilities.total + sc.costs.studentServices.total, 0) / totalCap;
              return {
                name: `${schoolTypeLabels[type]} (${typeSchools.length})`,
                type,
                model: Math.round(avgModel),
                actual: Math.round(avgActual),
                overrun: Math.round(avgActual - avgModel),
                count: typeSchools.length,
                totalCap,
              };
            }).filter((d): d is NonNullable<typeof d> => d !== null);

            // Expanded type school data (computed on demand)
            const expandedSchools = expandedType ? (() => {
              const typeSchools = schools.filter(s => s.schoolType === expandedType);
              return typeSchools.map(s => {
                const cap = Math.max(s.capacity, 1);
                const actual = (s.costs.lease.total + s.costs.fixedFacilities.total +
                  s.costs.variableFacilities.total + s.costs.studentServices.total) / cap;
                return {
                  name: s.displayName.length > 16 ? s.displayName.replace('Alpha ', 'A. ') : s.displayName,
                  model: Math.round(s.budget.modelFacPerStudent),
                  actual: Math.round(actual),
                  overrun: Math.round(actual - s.budget.modelFacPerStudent),
                  school: s,
                };
              }).sort((a, b) => b.overrun - a.overrun);
            })() : [];

            // Subcategory totals (ranked by size) — negotiation targets
            const subcategoryData = [
              { name: 'Food Services', value: schools.reduce((s, sc) => s + sc.costs.studentServices.foodServices, 0), color: '#ea580c' },
              { name: 'Lease / Rent', value: summary.totalLease, color: '#1e40af' },
              { name: 'Security', value: schools.reduce((s, sc) => s + sc.costs.fixedFacilities.security, 0), color: '#7c3aed' },
              { name: 'Transportation', value: schools.reduce((s, sc) => s + sc.costs.studentServices.transportation, 0), color: '#f97316' },
              { name: 'Repairs / Maint.', value: schools.reduce((s, sc) => s + sc.costs.variableFacilities.repairs, 0), color: '#0d9488' },
              { name: 'IT Maintenance', value: schools.reduce((s, sc) => s + sc.costs.fixedFacilities.itMaintenance, 0), color: '#8b5cf6' },
              { name: 'Utilities', value: schools.reduce((s, sc) => s + sc.costs.variableFacilities.utilities, 0), color: '#06b6d4' },
              { name: 'Janitorial', value: schools.reduce((s, sc) => s + sc.costs.variableFacilities.janitorial, 0), color: '#14b8a6' },
              { name: 'Landscaping', value: schools.reduce((s, sc) => s + sc.costs.fixedFacilities.landscaping, 0), color: '#a78bfa' },
            ].sort((a, b) => b.value - a.value);

            // Top 3 cost lines for insights
            const top3 = subcategoryData.slice(0, 3);
            const top3Total = top3.reduce((s, d) => s + d.value, 0);
            const top3Pct = portfolioFacActual > 0 ? (top3Total / portfolioFacActual * 100).toFixed(0) : '0';

            // Segment performance (per student at capacity) — keep
            const segTypes: SchoolType[] = ['alpha-school', 'growth-alpha', 'microschool', 'alternative', 'low-dollar'];
            const segmentData = segTypes.map(type => {
              const ts = schools.filter(s => s.schoolType === type);
              if (ts.length === 0) return null;
              const totalCap = Math.max(ts.reduce((s, sc) => s + sc.capacity, 0), 1);
              return {
                name: schoolTypeLabels[type],
                lease: Math.round(ts.reduce((s, sc) => s + sc.costs.lease.total, 0) / totalCap),
                fixedFac: Math.round(ts.reduce((s, sc) => s + sc.costs.fixedFacilities.total, 0) / totalCap),
                varFac: Math.round(ts.reduce((s, sc) => s + sc.costs.variableFacilities.total, 0) / totalCap),
                studentSvc: Math.round(ts.reduce((s, sc) => s + sc.costs.studentServices.total, 0) / totalCap),
                depr: Math.round(ts.reduce((s, sc) => s + sc.costs.annualDepreciation.total, 0) / totalCap),
                count: ts.length,
              };
            }).filter((d): d is NonNullable<typeof d> => d !== null);

            // Controllability donut
            const controlData = [
              { name: 'Lease (Locked)', value: summary.totalLease, color: '#64748b' },
              { name: 'Depreciation (Sunk)', value: summary.totalAnnualDepreciation, color: '#475569' },
              { name: 'Fixed Facilities', value: summary.totalFixedFacilities, color: '#7c3aed' },
              { name: 'Variable Facilities', value: summary.totalVariableFacilities, color: '#0d9488' },
              { name: 'Student Services', value: summary.totalStudentServices, color: '#ea580c' },
            ];
            const sunkTotal = summary.totalLease + summary.totalAnnualDepreciation;
            const sunkPct = summary.grandTotal > 0 ? (sunkTotal / summary.grandTotal * 100).toFixed(0) : '0';

            // Cost/sqft by type (for chart + comps table)
            const sqftByType = typeOrder.map(type => {
              const ts = schools.filter(s => s.schoolType === type && s.sqft > 0);
              if (ts.length === 0) return null;
              const sqft = Math.max(ts.reduce((s, sc) => s + sc.sqft, 0), 1);
              const lease = ts.reduce((s, sc) => s + sc.costs.lease.total, 0);
              const ops = ts.reduce((s, sc) => s + sc.costs.fixedFacilities.total + sc.costs.variableFacilities.total + sc.costs.annualDepreciation.total, 0);
              const svc = ts.reduce((s, sc) => s + sc.costs.studentServices.total, 0);
              return {
                label: schoolTypeLabels[type],
                lease: Math.round(lease / sqft),
                ops: Math.round(ops / sqft),
                svc: Math.round(svc / sqft),
                buildingOnly: Math.round((lease + ops) / sqft),
                total: Math.round((lease + ops + svc) / sqft),
              };
            }).filter((d): d is NonNullable<typeof d> => d !== null);
            const portfolioSqft = Math.max(summary.totalSqft, 1);
            const portfolioLeasePSF = Math.round(summary.totalLease / portfolioSqft);
            const portfolioOpsPSF = Math.round((summary.totalFixedFacilities + summary.totalVariableFacilities + summary.totalAnnualDepreciation) / portfolioSqft);
            const portfolioSvcPSF = Math.round(summary.totalStudentServices / portfolioSqft);
            const portfolioBuildingPSF = portfolioLeasePSF + portfolioOpsPSF;
            const portfolioTotalPSF = portfolioBuildingPSF + portfolioSvcPSF;

            // CapEx cash exposure — by school type with drill-down
            const capexTypeData = typeOrder.map(type => {
              const ts = schools.filter(s => s.schoolType === type);
              if (ts.length === 0) return null;
              const totalBuildout = ts.reduce((s, sc) => s + sc.costs.capexBuildout, 0);
              const totalCap = Math.max(ts.reduce((s, sc) => s + sc.capacity, 0), 1);
              return {
                name: `${schoolTypeLabels[type]} (${ts.length})`,
                type,
                buildout: totalBuildout,
                perSeat: Math.round(totalBuildout / totalCap),
                count: ts.length,
                totalCap,
              };
            }).filter((d): d is NonNullable<typeof d> => d !== null);

            const expandedCapexSchools = expandedCapexType ? schools
              .filter(s => s.schoolType === expandedCapexType)
              .sort((a, b) => b.costs.capexBuildout - a.costs.capexBuildout)
              .map(s => ({
                name: s.displayName.length > 16 ? s.displayName.replace('Alpha ', 'A. ') : s.displayName,
                buildout: s.costs.capexBuildout,
                perSeat: Math.round(s.costs.capexBuildout / Math.max(s.capacity, 1)),
                capacity: s.capacity,
                school: s,
              }))
            : [];

            const topCapexPct = (() => {
              const sorted = [...schools].sort((a, b) => b.costs.capexBuildout - a.costs.capexBuildout);
              const top5 = sorted.slice(0, 5).reduce((s, sc) => s + sc.costs.capexBuildout, 0);
              return summary.totalCapexBuildout > 0 ? (top5 / summary.totalCapexBuildout * 100).toFixed(0) : '0';
            })();

            return (
              <>
                {/* ===== HERO KPIs: Facilities Cost Story ===== */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="text-[10px] text-blue-400 uppercase tracking-wide font-medium">Model Fac Budget</div>
                    <div className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(portfolioFacBudget)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">${Math.round(portfolioFacBudget / portfolioCap).toLocaleString()}/student</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Actual Fac Cost</div>
                    <div className="text-xl font-bold text-white mt-1">{formatCurrency(portfolioFacActual)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">${Math.round(portfolioFacActual / portfolioCap).toLocaleString()}/student</div>
                  </div>
                  <div className="bg-red-900/30 rounded-xl p-4 border border-red-700">
                    <div className="text-[10px] text-red-400 uppercase tracking-wide font-medium">Facilities Overrun</div>
                    <div className="text-xl font-bold text-red-400 mt-1">{portfolioOverrun > 0 ? '+' : ''}{formatCurrency(portfolioOverrun)}</div>
                    <div className="text-xs text-red-500 mt-0.5">{overrunPct}% over approved model</div>
                  </div>
                  <div className="bg-red-900/20 rounded-xl p-4 border border-red-800/50">
                    <div className="text-[10px] text-red-300 uppercase tracking-wide font-medium">Overrun / Student</div>
                    <div className="text-xl font-bold text-red-300 mt-1">{avgOverrunPS > 0 ? '+' : ''}${Math.round(Math.abs(avgOverrunPS)).toLocaleString()}</div>
                    <div className="text-xs text-red-500 mt-0.5">per seat at capacity</div>
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">At Target Margin</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {schoolsAtTarget}<span className="text-sm text-slate-400 font-normal">/{summary.totalSchools}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">even at full capacity</div>
                  </div>
                  <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800/50">
                    <div className="text-[10px] text-amber-400 uppercase tracking-wide font-medium">CapEx Cash Deployed</div>
                    <div className="text-xl font-bold text-amber-300 mt-1">{formatCurrency(summary.totalCapexBuildout)}</div>
                    <div className="text-xs text-amber-600 mt-0.5">Top 5 = {topCapexPct}% of total</div>
                  </div>
                </div>

                {/* ===== ROW 2: THE APPROVED MODEL VS REALITY — BY TYPE ===== */}
                <div className="table-card rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800 text-white">
                    <h3 className="font-semibold">The Approved Model vs Reality: Facilities $/Student</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Weighted average per school type. Blue = approved model. Red/green = actual cost. <span className="text-blue-400">Click a category to see individual schools.</span></p>
                  </div>
                  <div className="p-4" style={{ height: typeSummaryData.length * 50 + 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={typeSummaryData}
                        layout="vertical"
                        margin={{ left: 170, right: 40, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} stroke="#94a3b8" fontSize={11} />
                        <YAxis
                          type="category" dataKey="name" width={160} tickLine={false}
                          tick={({ x, y, payload }: any) => {
                            const entry = typeSummaryData.find(d => d.name === payload.value);
                            const isActive = entry && expandedType === entry.type;
                            return (
                              <text x={x} y={y} dy={4} textAnchor="end"
                                fill={isActive ? '#93c5fd' : '#e2e8f0'}
                                fontSize={12} fontWeight={600}
                                style={{ cursor: 'pointer' }}
                              >
                                {payload.value}
                              </text>
                            );
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            if (!d) return null;
                            return (
                              <div className="bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-xs shadow-xl">
                                <div className="font-bold text-white text-sm mb-1">{d.name}</div>
                                <div className="text-slate-300">Model: <span className="font-medium text-blue-400">${d.model.toLocaleString()}/student</span></div>
                                <div className="text-slate-300">Actual: <span className={`font-medium ${d.overrun > 0 ? 'text-red-400' : 'text-green-400'}`}>${d.actual.toLocaleString()}/student</span></div>
                                <div className={`mt-1 font-medium ${d.overrun > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                  {d.overrun > 0 ? '+' : ''}${d.overrun.toLocaleString()} ({d.model > 0 ? `${d.overrun > 0 ? '+' : ''}${Math.round(d.overrun / d.model * 100)}%` : '—'})
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{d.count} schools, {d.totalCap} seats | Click to drill in</div>
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
                        <Bar
                          dataKey="model" name="Approved Model" fill="#3b82f6" barSize={14} radius={[0, 3, 3, 0]}
                          onClick={(_d: any, idx: number) => {
                            const entry = typeSummaryData[idx];
                            if (entry) setExpandedType(expandedType === entry.type ? null : entry.type);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <Bar dataKey="actual" name="Actual Cost" barSize={14} radius={[0, 3, 3, 0]}
                          onClick={(_d: any, idx: number) => {
                            const entry = typeSummaryData[idx];
                            if (entry) setExpandedType(expandedType === entry.type ? null : entry.type);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {typeSummaryData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.overrun > 0 ? '#ef4444' : '#22c55e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Expanded school detail panel */}
                  {expandedType && expandedSchools.length > 0 && (
                    <div className="border-t border-slate-700">
                      <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-800/30 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-300 text-sm">{schoolTypeLabels[expandedType]} — School Detail</h4>
                          <p className="text-[11px] text-slate-400">{expandedSchools.length} schools. Click a bar to open full school profile.</p>
                        </div>
                        <button onClick={() => setExpandedType(null)} className="text-slate-400 hover:text-white text-lg leading-none px-2 py-1 rounded hover:bg-slate-700">x</button>
                      </div>
                      <div className="p-4" style={{ height: Math.max(180, expandedSchools.length * 36 + 40) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={expandedSchools} layout="vertical" margin={{ left: 170, right: 40, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} stroke="#94a3b8" fontSize={11} />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#cbd5e1', fontSize: 11 }} tickLine={false} />
                            <Tooltip
                              formatter={(v: number, name: string) => [`$${v.toLocaleString()}/student`, name]}
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                            />
                            <Bar dataKey="model" name="Approved Model" fill="#3b82f6" barSize={12} radius={[0, 3, 3, 0]}
                              onClick={(_d: any, idx: number) => { const s = expandedSchools[idx]?.school; if (s) setSelectedSchool(s); }}
                              style={{ cursor: 'pointer' }}
                            />
                            <Bar dataKey="actual" name="Actual Cost" barSize={12} radius={[0, 3, 3, 0]}
                              onClick={(_d: any, idx: number) => { const s = expandedSchools[idx]?.school; if (s) setSelectedSchool(s); }}
                              style={{ cursor: 'pointer' }}
                            >
                              {expandedSchools.map((entry, idx) => (
                                <Cell key={idx} fill={entry.overrun > 0 ? '#ef4444' : '#22c55e'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* ===== ROW 3: WHERE THE MONEY GOES + MARGIN EROSION ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Where the Money Goes — Subcategory Breakdown */}
                  <div className="table-card rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-slate-800 text-white">
                      <h3 className="font-semibold">Where the Money Goes</h3>
                      <p className="text-xs text-slate-300 mt-0.5">Portfolio-wide facilities spend by line item, ranked by size. Top 3 = {top3Pct}% of total. These are your negotiation targets.</p>
                    </div>
                    <div className="p-4" style={{ height: Math.max(300, subcategoryData.length * 34 + 40) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subcategoryData} layout="vertical" margin={{ left: 120, right: 40, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} stroke="#94a3b8" fontSize={11} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#cbd5e1', fontSize: 11 }} tickLine={false} />
                          <Tooltip
                            formatter={(v: number) => [formatCurrency(v), 'Total Spend']}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                          />
                          <Bar dataKey="value" name="Total Spend" barSize={18} radius={[0, 4, 4, 0]}>
                            {subcategoryData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Cost/Sq Ft — Chart + Comps Table */}
                  <div className="table-card rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-slate-800 text-white">
                      <h3 className="font-semibold">Cost/Sq Ft by Category</h3>
                      <p className="text-xs text-slate-300 mt-0.5">Building costs per sq ft by school type (excl. food/transport). Industry comps below.</p>
                    </div>
                    <div className="p-4 pb-2">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={sqftByType} margin={{ top: 10, right: 10, bottom: 5, left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: '#cbd5e1', fontSize: 10 }}
                            stroke="#94a3b8"
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                            height={40}
                          />
                          <YAxis tickFormatter={(v: number) => `$${v}`} stroke="#94a3b8" fontSize={11} />
                          <Tooltip
                            formatter={(v: number, name: string) => [`$${v}/sqft`, name]}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                          <Bar dataKey="lease" name="Lease" stackId="sqft" fill="#1e40af" barSize={32} />
                          <Bar dataKey="ops" name="Building Ops" stackId="sqft" fill="#7c3aed" barSize={32} />
                          <Bar dataKey="svc" name="Food / Transport" stackId="sqft" fill="#ea580c" barSize={32} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="px-4 pb-3">
                      <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-2 px-1">Industry Comps</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">$/Sq Ft</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-white bg-blue-900/20">Portfolio</th>
                            {sqftByType.map(t => (
                              <th key={t.label} className="px-3 py-2 text-right text-xs font-medium text-slate-300">{t.label}</th>
                            ))}
                            <th className="px-3 py-2 text-right text-xs font-medium text-amber-400 border-l border-slate-600">Premium K-12</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-green-400">Avg Private</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Charter</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          <tr className="hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-xs text-slate-300 font-medium">Lease</td>
                            <td className="px-3 py-2 text-right font-bold text-white bg-blue-900/10">${portfolioLeasePSF}</td>
                            {sqftByType.map(t => (
                              <td key={t.label} className="px-3 py-2 text-right text-slate-200">${t.lease}</td>
                            ))}
                            <td className="px-3 py-2 text-right text-amber-300 border-l border-slate-600">$25–40</td>
                            <td className="px-3 py-2 text-right text-green-300">$18–25</td>
                            <td className="px-3 py-2 text-right text-slate-400">$12–18</td>
                          </tr>
                          <tr className="hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-xs text-slate-300 font-medium">Building Ops</td>
                            <td className="px-3 py-2 text-right font-bold text-white bg-blue-900/10">${portfolioOpsPSF}</td>
                            {sqftByType.map(t => (
                              <td key={t.label} className="px-3 py-2 text-right text-slate-200">${t.ops}</td>
                            ))}
                            <td className="px-3 py-2 text-right text-amber-300 border-l border-slate-600">$15–25</td>
                            <td className="px-3 py-2 text-right text-green-300">$10–15</td>
                            <td className="px-3 py-2 text-right text-slate-400">$6–10</td>
                          </tr>
                          <tr className="bg-slate-800/30 font-semibold hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-xs text-slate-200">Building Subtotal</td>
                            <td className={`px-3 py-2 text-right bg-blue-900/10 ${portfolioBuildingPSF > 50 ? 'text-red-400' : portfolioBuildingPSF > 30 ? 'text-amber-400' : 'text-green-400'}`}>${portfolioBuildingPSF}</td>
                            {sqftByType.map(t => (
                              <td key={t.label} className={`px-3 py-2 text-right ${t.buildingOnly > 50 ? 'text-red-400' : t.buildingOnly > 30 ? 'text-amber-400' : 'text-green-400'}`}>${t.buildingOnly}</td>
                            ))}
                            <td className="px-3 py-2 text-right text-amber-300 border-l border-slate-600">$40–65</td>
                            <td className="px-3 py-2 text-right text-green-300">$28–40</td>
                            <td className="px-3 py-2 text-right text-slate-400">$18–28</td>
                          </tr>
                          <tr className="hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-xs text-slate-300 font-medium">Food / Transport</td>
                            <td className="px-3 py-2 text-right text-orange-400 bg-blue-900/10">${portfolioSvcPSF}</td>
                            {sqftByType.map(t => (
                              <td key={t.label} className="px-3 py-2 text-right text-orange-300">${t.svc}</td>
                            ))}
                            <td className="px-3 py-2 text-right text-slate-500 border-l border-slate-600" colSpan={3}>
                              <span className="text-[10px]">Varies — not in building comps</span>
                            </td>
                          </tr>
                          <tr className="bg-slate-800/40 font-bold hover:bg-slate-800/60 border-t border-slate-600">
                            <td className="px-3 py-2 text-xs text-white">All-In Total</td>
                            <td className="px-3 py-2 text-right text-base text-white bg-blue-900/10">${portfolioTotalPSF}</td>
                            {sqftByType.map(t => (
                              <td key={t.label} className="px-3 py-2 text-right text-white font-bold">${t.total}</td>
                            ))}
                            <td className="px-3 py-2 text-right text-slate-500 border-l border-slate-600" colSpan={3}>
                              <span className="text-[10px]">Matches Executive View</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-2 text-[10px] text-slate-500 border-t border-slate-700/50">
                      Industry benchmarks: NCES Private School Universe Survey, BOMA Experience Exchange Report. Building ops = security, IT, landscaping, janitorial, utilities, repairs, depreciation. Food/transport excluded for apples-to-apples comparison.
                    </div>
                  </div>
                </div>

                {/* ===== ROW 3.5: CAPEX CASH EXPOSURE — BY CATEGORY ===== */}
                <div className="table-card rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">CapEx Cash Exposure by School Type</h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Total one-time buildout by category. Top 5 schools = {topCapexPct}% of total.
                          <span className="text-blue-400"> Click to see individual schools.</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-lg font-bold text-white">{formatCurrency(summary.totalCapexBuildout)}</div>
                        <div className="text-[10px] text-slate-400">total deployed</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4" style={{ height: capexTypeData.length * 50 + 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={capexTypeData} layout="vertical" margin={{ left: 170, right: 60, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`}
                          stroke="#94a3b8" fontSize={11}
                        />
                        <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-xs shadow-xl">
                                <div className="font-bold text-white text-sm mb-1">{d.name}</div>
                                <div className="text-slate-300">Total Buildout: <span className="font-medium text-white">{formatCurrency(d.buildout)}</span></div>
                                <div className="text-slate-300">Per Seat: <span className="font-medium text-white">${d.perSeat.toLocaleString()}</span></div>
                                <div className="text-slate-300">{d.count} schools, {d.totalCap} seats</div>
                                <div className="text-blue-400 mt-0.5 text-[10px]">Click to drill in</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="buildout" name="CapEx Buildout" barSize={14} radius={[0, 4, 4, 0]}
                          onClick={(_d: any, idx: number) => { const e = capexTypeData[idx]; if (e) setExpandedCapexType(expandedCapexType === e.type ? null : e.type); }}
                          style={{ cursor: 'pointer' }}
                        >
                          {capexTypeData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.buildout > 2000000 ? '#ef4444' : entry.buildout > 500000 ? '#f59e0b' : '#22c55e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {expandedCapexType && expandedCapexSchools.length > 0 && (
                    <div className="border-t border-slate-700">
                      <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-800/30 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-300 text-sm">{schoolTypeLabels[expandedCapexType]} — School Detail</h4>
                          <p className="text-[11px] text-slate-400">Click a bar to open full school profile.</p>
                        </div>
                        <button onClick={() => setExpandedCapexType(null)} className="text-slate-400 hover:text-white text-lg leading-none px-2 py-1 rounded hover:bg-slate-700">x</button>
                      </div>
                      <div className="p-4" style={{ height: Math.max(180, expandedCapexSchools.length * 36 + 40) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={expandedCapexSchools} layout="vertical" margin={{ left: 170, right: 60, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis
                              type="number"
                              tickFormatter={(v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`}
                              stroke="#94a3b8" fontSize={11}
                            />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#cbd5e1', fontSize: 11 }} tickLine={false} />
                            <Tooltip
                              content={({ active, payload }: any) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-xs shadow-xl">
                                    <div className="font-bold text-white text-sm mb-1">{d.name}</div>
                                    <div className="text-slate-300">Buildout: <span className="font-medium text-white">{formatCurrency(d.buildout)}</span></div>
                                    <div className="text-slate-300">Per Seat: <span className="font-medium text-white">${d.perSeat.toLocaleString()}</span></div>
                                    <div className="text-slate-300">Capacity: <span className="font-medium text-white">{d.capacity} seats</span></div>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="buildout" name="CapEx Buildout" barSize={12} radius={[0, 4, 4, 0]}
                              onClick={(_d: any, idx: number) => { const s = expandedCapexSchools[idx]?.school; if (s) setSelectedSchool(s); }}
                              style={{ cursor: 'pointer' }}
                            >
                              {expandedCapexSchools.map((entry, idx) => (
                                <Cell key={idx} fill={entry.buildout > 500000 ? '#ef4444' : entry.buildout > 100000 ? '#f59e0b' : '#22c55e'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* ===== ROW 4: SEGMENT COMPARISON + CONTROLLABILITY ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Cost Structure by School Type */}
                  <div className="table-card rounded-xl overflow-hidden lg:col-span-2">
                    <div className="px-5 py-3 bg-slate-800 text-white">
                      <h3 className="font-semibold">Cost Structure by School Type (per student at capacity)</h3>
                      <p className="text-xs text-slate-300 mt-0.5">Weighted average across all schools in each type. Shows what drives cost by segment.</p>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={segmentData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis
                            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                            stroke="#94a3b8" fontSize={11}
                          />
                          <Tooltip
                            formatter={(v: number, name: string) => [`$${v.toLocaleString()}/student`, name]}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                          <Bar dataKey="lease" name="Lease" stackId="cost" fill="#1e40af" />
                          <Bar dataKey="depr" name="Depreciation" stackId="cost" fill="#475569" />
                          <Bar dataKey="fixedFac" name="Fixed Facilities" stackId="cost" fill="#7c3aed" />
                          <Bar dataKey="varFac" name="Variable Facilities" stackId="cost" fill="#0d9488" />
                          <Bar dataKey="studentSvc" name="Student Services" stackId="cost" fill="#ea580c" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2 justify-center">
                        {segmentData.map(d => (
                          <span key={d.name}>{d.name}: {d.count} schools, ${(d.lease + d.depr + d.fixedFac + d.varFac + d.studentSvc).toLocaleString()}/student</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Controllability Donut */}
                  <div className="table-card rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-slate-800 text-white">
                      <h3 className="font-semibold">What You Can Actually Change</h3>
                      <p className="text-xs text-slate-300 mt-0.5">{sunkPct}% of facilities cost is locked in (lease + depreciation).</p>
                    </div>
                    <div className="p-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ paddingBottom: 40 }}>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white">{sunkPct}%</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">locked in</div>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={230}>
                          <PieChart>
                            <Pie
                              data={controlData}
                              dataKey="value"
                              cx="50%" cy="50%"
                              innerRadius={55} outerRadius={85}
                              paddingAngle={2}
                            >
                              {controlData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {controlData.map(d => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                              <span className="text-slate-300">{d.name}</span>
                            </div>
                            <span className="font-medium text-white">{formatCurrency(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== ROW 5: KEY INSIGHT BANNER ===== */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
                  <div className="text-sm text-slate-200 space-y-2">
                    <div className="font-semibold text-white text-base mb-2">The Bottom Line</div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 font-bold mt-0.5">1.</span>
                      <span><strong className="text-white">Facilities OpEx exceeds the approved model by {formatCurrency(portfolioOverrun)} (+{overrunPct}%).</strong> The model underestimated what it actually costs to run these buildings — security, food services, and transportation alone account for {top3Pct}% of all facilities spend.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 font-bold mt-0.5">2.</span>
                      <span><strong className="text-white">CapEx cash exposure is concentrated in new buildouts.</strong> The top 5 schools account for {topCapexPct}% of the {formatCurrency(summary.totalCapexBuildout)} total. Established MicroSchools built out for ~$25K; new Growth/Alpha locations are running $400K–$1.8M — a fundamentally different cost profile that the original model didn&apos;t anticipate.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 font-bold mt-0.5">3.</span>
                      <span><strong className="text-white">Only {schoolsAtTarget}/{summary.totalSchools} schools can reach target margin even at 100% capacity.</strong> Facilities costs are structurally too high for the approved model to work. Both the ongoing OpEx overrun and the upfront cash exposure need to be addressed — vendor renegotiation, scope reduction, and realistic buildout budgets for new locations.</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* BUDGET VS ACTUALS TAB */}
      {activeTab === 'segmentation' && (
        <div className="space-y-6">
          {(() => {
            const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;
            const typeOptions: { key: SchoolType | 'all'; label: string }[] = [
              { key: 'all', label: 'All' },
              ...Object.entries(schoolTypeLabels).map(([k, l]) => ({ key: k as SchoolType, label: l })),
            ];
            const facSorted = [...schools].sort((a, b) => {
              const capA = Math.max(a.capacity, 1); const capB = Math.max(b.capacity, 1);
              const facVarA = (a.costs.lease.total + a.costs.fixedFacilities.total + a.costs.variableFacilities.total + a.costs.studentServices.total) - a.budget.modelFacPerStudent * capA;
              const facVarB = (b.costs.lease.total + b.costs.fixedFacilities.total + b.costs.variableFacilities.total + b.costs.studentServices.total) - b.budget.modelFacPerStudent * capB;
              return Math.abs(facVarB) - Math.abs(facVarA);
            });
            const capexSorted = [...schools].sort((a, b) => Math.abs(b.costs.capexBuildout - b.budget.capexBudget) - Math.abs(a.costs.capexBuildout - a.budget.capexBudget));
            const pCap = Math.max(summary.totalCapacity, 1);
            const pFacBudget = schools.reduce((s, sc) => s + sc.budget.modelFacPerStudent * sc.capacity, 0);
            const pFacActual = summary.totalLease + summary.totalFixedFacilities + summary.totalVariableFacilities + summary.totalStudentServices;
            const pFacVar = pFacActual - pFacBudget;

            return (
              <>
                {/* Filter pills */}
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold text-white mr-2">Budget vs Actual</h2>
                  <div className="flex flex-wrap gap-1">
                    {typeOptions.map(opt => (
                      <button key={opt.key} onClick={() => setSchoolTypeFilter(opt.key)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${schoolTypeFilter === opt.key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>

                {/* === CHART: CapEx vs Facilities OpEx Variance — By Category === */}
                {(() => {
                  const varTypeOrder: SchoolType[] = ['alpha-school', 'growth-alpha', 'microschool', 'alternative', 'low-dollar'];
                  const computeSchoolVariance = (school: SchoolData) => {
                    const cap = Math.max(school.capacity, 1);
                    const facBudget = school.budget.modelFacPerStudent * cap;
                    const facActual = school.costs.lease.total + school.costs.fixedFacilities.total +
                      school.costs.variableFacilities.total + school.costs.studentServices.total;
                    const capexBudget = school.budget.capexBudget;
                    const capexActual = school.costs.capexBuildout;
                    const deprPeriod = school.costs.annualDepreciation.total > 0 ? capexActual / school.costs.annualDepreciation.total : 10;
                    const capexBudgetDepr = capexBudget / deprPeriod;
                    return {
                      facOpEx: Math.round((facActual - facBudget) / cap),
                      capExDepr: Math.round((school.costs.annualDepreciation.total - capexBudgetDepr) / cap),
                    };
                  };

                  // Type-level summary
                  const varianceTypeData = varTypeOrder.map(type => {
                    const ts = schools.filter(s => s.schoolType === type);
                    if (ts.length === 0) return null;
                    const totalCap = Math.max(ts.reduce((s, sc) => s + sc.capacity, 0), 1);
                    const totals = ts.reduce((acc, sc) => {
                      const v = computeSchoolVariance(sc);
                      return { facOpEx: acc.facOpEx + v.facOpEx * Math.max(sc.capacity, 1), capExDepr: acc.capExDepr + v.capExDepr * Math.max(sc.capacity, 1) };
                    }, { facOpEx: 0, capExDepr: 0 });
                    return {
                      name: `${schoolTypeLabels[type]} (${ts.length})`,
                      type,
                      facOpEx: Math.round(totals.facOpEx / totalCap),
                      capExDepr: Math.round(totals.capExDepr / totalCap),
                      count: ts.length,
                    };
                  }).filter((d): d is NonNullable<typeof d> => d !== null);

                  // Expanded school data
                  const expandedVarSchools = expandedVarianceType ? schools
                    .filter(s => s.schoolType === expandedVarianceType)
                    .map(s => {
                      const v = computeSchoolVariance(s);
                      return {
                        name: s.displayName.length > 16 ? s.displayName.replace('Alpha ', 'A. ') : s.displayName,
                        ...v,
                        school: s,
                      };
                    }).sort((a, b) => (b.facOpEx + b.capExDepr) - (a.facOpEx + a.capExDepr))
                  : [];

                  return (
                    <div className="table-card rounded-xl overflow-hidden">
                      <div className="px-5 py-3 bg-slate-800 text-white">
                        <h3 className="font-semibold">Variance Source: Facilities OpEx vs CapEx Depreciation</h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Per-student budget variance by school type. <span className="text-blue-400">Click a category to see individual schools.</span>
                        </p>
                      </div>
                      <div className="p-4" style={{ height: varianceTypeData.length * 50 + 60 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={varianceTypeData} layout="vertical" margin={{ left: 170, right: 40, top: 5, bottom: 5 }} stackOffset="sign">
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}$${v.toLocaleString()}`} stroke="#94a3b8" fontSize={11} />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} tickLine={false} />
                            <Tooltip
                              formatter={(v: number, name: string) => [`${v >= 0 ? '+' : ''}$${v.toLocaleString()}/student`, name]}
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
                            <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={2} />
                            <Bar dataKey="facOpEx" name="Facilities OpEx Variance" stackId="v" fill="#ef4444" barSize={14} radius={[0, 3, 3, 0]}
                              onClick={(_d: any, idx: number) => { const e = varianceTypeData[idx]; if (e) setExpandedVarianceType(expandedVarianceType === e.type ? null : e.type); }}
                              style={{ cursor: 'pointer' }}
                            />
                            <Bar dataKey="capExDepr" name="CapEx Depr. Variance" stackId="v" fill="#64748b" barSize={14} radius={[0, 3, 3, 0]}
                              onClick={(_d: any, idx: number) => { const e = varianceTypeData[idx]; if (e) setExpandedVarianceType(expandedVarianceType === e.type ? null : e.type); }}
                              style={{ cursor: 'pointer' }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {expandedVarianceType && expandedVarSchools.length > 0 && (
                        <div className="border-t border-slate-700">
                          <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-800/30 flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-blue-300 text-sm">{schoolTypeLabels[expandedVarianceType]} — School Detail</h4>
                              <p className="text-[11px] text-slate-400">Click a bar to open full school profile.</p>
                            </div>
                            <button onClick={() => setExpandedVarianceType(null)} className="text-slate-400 hover:text-white text-lg leading-none px-2 py-1 rounded hover:bg-slate-700">x</button>
                          </div>
                          <div className="p-4" style={{ height: Math.max(180, expandedVarSchools.length * 36 + 40) }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={expandedVarSchools} layout="vertical" margin={{ left: 170, right: 40, top: 5, bottom: 5 }} stackOffset="sign">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}$${v.toLocaleString()}`} stroke="#94a3b8" fontSize={11} />
                                <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#cbd5e1', fontSize: 11 }} tickLine={false} />
                                <Tooltip
                                  formatter={(v: number, name: string) => [`${v >= 0 ? '+' : ''}$${v.toLocaleString()}/student`, name]}
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                                  labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                                />
                                <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
                                <Bar dataKey="facOpEx" name="Facilities OpEx" stackId="v" fill="#ef4444" barSize={12}
                                  onClick={(_d: any, idx: number) => { const s = expandedVarSchools[idx]?.school; if (s) setSelectedSchool(s); }}
                                  style={{ cursor: 'pointer' }}
                                />
                                <Bar dataKey="capExDepr" name="CapEx Depr." stackId="v" fill="#64748b" barSize={12}
                                  onClick={(_d: any, idx: number) => { const s = expandedVarSchools[idx]?.school; if (s) setSelectedSchool(s); }}
                                  style={{ cursor: 'pointer' }}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* TABLE 1: Facilities Budget vs Actual */}
                <div className="table-card rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800 text-white">
                    <h3 className="font-semibold">Facilities — Budget vs Actual</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Budget = approved model (Col W). Actual = Lease + Fixed + Variable + Student Svc. All at capacity.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 sticky left-0 z-10" style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>School</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-400">Students</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-blue-700 bg-blue-50">Budget</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-blue-700 bg-blue-50">Budget/Student<br/><span className="font-normal text-[9px]">% of tuition</span></th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-blue-700 bg-blue-50">Actual</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-blue-700 bg-blue-50">Actual/Student<br/><span className="font-normal text-[9px]">% of tuition</span></th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-amber-700 bg-amber-50">Absolute Var.</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-amber-700 bg-amber-50">Var/Student<br/><span className="font-normal text-[9px]">% of tuition</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
                        {facSorted.map((school, idx) => {
                          const cap = Math.max(school.capacity, 1);
                          const budget = school.budget.modelFacPerStudent * cap;
                          const actual = school.costs.lease.total + school.costs.fixedFacilities.total + school.costs.variableFacilities.total + school.costs.studentServices.total;
                          const budgetPS = budget / cap;
                          const actualPS = actual / cap;
                          const absVar = actual - budget;
                          const varPS = absVar / cap;
                          const budgetPctT = school.tuition > 0 ? (budgetPS / school.tuition) * 100 : 0;
                          const actualPctT = school.tuition > 0 ? (actualPS / school.tuition) * 100 : 0;
                          const varPctT = school.tuition > 0 ? (varPS / school.tuition) * 100 : 0;
                          const over = varPS > 0;
              return (
                            <tr key={school.id} className={`hover:bg-slate-700/40 cursor-pointer `} onClick={() => setSelectedSchool(school)}>
                              <td className={`px-2 py-2 sticky left-0 z-10 ${idx % 2 === 1 ? '' : ''}`} style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>
                                <div className="font-medium text-slate-100 text-sm">{school.displayName}</div>
                                <div className="text-[11px] text-slate-400">{schoolTypeLabels[school.schoolType]} | ${school.tuition.toLocaleString()} | <span className={school.isOperating ? 'text-green-400' : 'text-slate-500'}>{school.isOperating ? 'Operating' : 'Pre-Opening'}</span></div>
                  </td>
                              <td className="px-2 py-2 text-center">{school.capacity}</td>
                              <td className="px-2 py-2 text-right">{formatCurrency(budget)}</td>
                              <td className="px-2 py-2 text-right">
                                <div>{fmt(budgetPS)}</div>
                                <div className="text-[10px] text-slate-400">{budgetPctT.toFixed(1)}%</div>
                              </td>
                              <td className="px-2 py-2 text-right">{formatCurrency(actual)}</td>
                              <td className="px-2 py-2 text-right">
                                <div>{fmt(actualPS)}</div>
                                <div className="text-[10px] text-slate-400">{actualPctT.toFixed(1)}%</div>
                              </td>
                              <td className={`px-2 py-2 text-right font-medium ${over ? 'text-red-400' : 'text-green-400'}`}>
                                {over ? '+' : ''}{formatCurrency(absVar)}
                              </td>
                              <td className={`px-2 py-2 text-right answer-glow ${over ? 'text-red-400' : 'text-green-400'}`}>
                                <div className="font-bold">{over ? '+' : ''}{fmt(varPS)}</div>
                                <div className="text-[10px] text-slate-400">{varPctT >= 0 ? '+' : ''}{varPctT.toFixed(1)}%</div>
                              </td>
                </tr>
              );
            })}
                        {(() => {
                          const pBudgetPS = pFacBudget / pCap;
                          const pActualPS = pFacActual / pCap;
                          const pVarPS = pFacVar / pCap;
                          return (
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                              <td className="px-2 py-3">PORTFOLIO</td>
                              <td className="px-2 py-3 text-center">{summary.totalCapacity}</td>
                              <td className="px-2 py-3 text-right">{formatCurrency(pFacBudget)}</td>
                              <td className="px-2 py-3 text-right">{fmt(pBudgetPS)}</td>
                              <td className="px-2 py-3 text-right">{formatCurrency(pFacActual)}</td>
                              <td className="px-2 py-3 text-right">{fmt(pActualPS)}</td>
                              <td className={`px-2 py-3 text-right ${pFacVar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {pFacVar > 0 ? '+' : ''}{formatCurrency(pFacVar)}
                              </td>
                              <td className={`px-2 py-3 text-right ${pFacVar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {pFacVar > 0 ? '+' : ''}{fmt(pVarPS)}
                              </td>
            </tr>
                          );
                        })()}
          </tbody>
        </table>
      </div>
    </div>

                {/* TABLE 2: CapEx Budget vs Actual */}
                <div className="table-card rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800 text-white">
                    <h3 className="font-semibold">CapEx — Budget vs Actual</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Budget = rate × capacity × depr period. Budget Depr = annual. Absolute Var = actual − budget. Depr Var/Student = annualized variance per student.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 sticky left-0 z-10" style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>School</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-400">Students</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-slate-700 bg-slate-50">Budget</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-slate-700 bg-slate-50">Budget Depr.</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-slate-700 bg-slate-50">Actual</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-slate-700 bg-slate-50">Actual Depr.</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-amber-700 bg-amber-50">Absolute Var.</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-amber-700 bg-amber-50">Var/Year</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-amber-700 bg-amber-50">Depr. Var/Student<br/><span className="font-normal text-[9px]">% of tuition</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
                        {capexSorted.map((school, idx) => {
                          const cap = Math.max(school.capacity, 1);
                          const budget = school.budget.capexBudget;
                          const actual = school.costs.capexBuildout;
                          const annDepr = school.costs.annualDepreciation.total;
                          const deprPeriod = annDepr > 0 ? actual / annDepr : 10;
                          const budgetDepr = budget / deprPeriod;
                          const absVar = actual - budget;
                          const deprVarPS = (annDepr - budgetDepr) / cap;
                          const pctT = school.tuition > 0 ? (deprVarPS / school.tuition) * 100 : 0;
                          const isAbsOver = absVar > 0;
                          const isDeprOver = deprVarPS > 0;
              return (
                            <tr key={school.id} className={`hover:bg-slate-700/40 cursor-pointer `} onClick={() => setSelectedSchool(school)}>
                              <td className={`px-2 py-2 sticky left-0 z-10 ${idx % 2 === 1 ? '' : ''}`} style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>
                                <div className="font-medium text-slate-100 text-sm">{school.displayName}</div>
                                <div className="text-[11px] text-slate-400">{schoolTypeLabels[school.schoolType]} | ${school.tuition.toLocaleString()} | <span className={school.isOperating ? 'text-green-400' : 'text-slate-500'}>{school.isOperating ? 'Operating' : 'Pre-Opening'}</span></div>
                  </td>
                              <td className="px-2 py-2 text-center">{school.capacity}</td>
                              <td className="px-2 py-2 text-right">{formatCurrency(budget)}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{formatCurrency(budgetDepr)}<span className="text-[10px] text-slate-400">/yr</span></td>
                              <td className="px-2 py-2 text-right">{formatCurrency(actual)}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{formatCurrency(annDepr)}<span className="text-[10px] text-slate-400">/yr</span></td>
                              <td className={`px-2 py-2 text-right font-medium ${isAbsOver ? 'text-red-400' : 'text-green-400'}`}>
                                {isAbsOver ? '+' : ''}{formatCurrency(absVar)}
                  </td>
                              <td className={`px-2 py-2 text-right font-medium ${isDeprOver ? 'text-red-400' : 'text-green-400'}`}>
                                {isDeprOver ? '+' : ''}{formatCurrency(annDepr - budgetDepr)}
                  </td>
                              <td className={`px-2 py-2 text-right answer-glow ${isDeprOver ? 'text-red-400' : 'text-green-400'}`}>
                                <div className="font-bold">{isDeprOver ? '+' : ''}{fmt(deprVarPS)}</div>
                                <div className="text-[10px] text-slate-400">{pctT >= 0 ? '+' : ''}{pctT.toFixed(1)}%</div>
                  </td>
                            </tr>
                          );
                        })}
                        {(() => {
                          const pBudget = summary.totalCapexBudget;
                          const pActual = summary.totalCapexBuildout;
                          const pDeprPeriod = summary.totalAnnualDepreciation > 0 ? pActual / summary.totalAnnualDepreciation : 10;
                          const pBudgetDepr = pBudget / pDeprPeriod;
                          const pActualDepr = summary.totalAnnualDepreciation;
                          const pAbsVar = pActual - pBudget;
                          const pDeprVarPS = (pActualDepr - pBudgetDepr) / pCap;
                          return (
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                              <td className="px-2 py-3">PORTFOLIO</td>
                              <td className="px-2 py-3 text-center">{summary.totalCapacity}</td>
                              <td className="px-2 py-3 text-right">{formatCurrency(pBudget)}</td>
                              <td className="px-2 py-3 text-right text-slate-700">{formatCurrency(pBudgetDepr)}<span className="text-[10px] text-slate-400">/yr</span></td>
                              <td className="px-2 py-3 text-right">{formatCurrency(pActual)}</td>
                              <td className="px-2 py-3 text-right text-slate-700">{formatCurrency(pActualDepr)}<span className="text-[10px] text-slate-400">/yr</span></td>
                              <td className={`px-2 py-3 text-right ${pAbsVar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {pAbsVar > 0 ? '+' : ''}{formatCurrency(pAbsVar)}
                  </td>
                              <td className={`px-2 py-3 text-right ${(pActualDepr - pBudgetDepr) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {(pActualDepr - pBudgetDepr) > 0 ? '+' : ''}{formatCurrency(pActualDepr - pBudgetDepr)}
                  </td>
                              <td className={`px-2 py-3 text-right ${pDeprVarPS > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {pDeprVarPS > 0 ? '+' : ''}{fmt(pDeprVarPS)}
                  </td>
                </tr>
              );
                        })()}
          </tbody>
        </table>
      </div>
    </div>
              </>
            );
          })()}
        </div>
      )}

      {/* UNIT ECONOMICS / BREAK-EVEN TAB */}
      {activeTab === 'breakeven' && (
        <div className="space-y-6">
          {/* Per-school unit economics */}
          {(() => {
            const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;
            const typeOptions: { key: SchoolType | 'all'; label: string }[] = [
              { key: 'all', label: 'All' },
              ...Object.entries(schoolTypeLabels).map(([k, l]) => ({ key: k as SchoolType, label: l })),
            ];

  return (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold text-white mr-2">Unit Economics &amp; Break-Even</h2>
                  <div className="flex flex-wrap gap-1">
                    {typeOptions.map(opt => (
                      <button key={opt.key} onClick={() => setSchoolTypeFilter(opt.key)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${schoolTypeFilter === opt.key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                      >{opt.label}</button>
                    ))}
                  </div>
      </div>

                {/* === CHART: Model vs Actual Margin — By Category === */}
                {(() => {
                  const mTypeOrder: SchoolType[] = ['alpha-school', 'growth-alpha', 'microschool', 'alternative', 'low-dollar'];
                  const computeMargins = (school: SchoolData) => {
                    const facTotal = school.costs.lease.total + school.costs.fixedFacilities.total +
                      school.costs.variableFacilities.total + school.costs.studentServices.total;
                    const ue = calculateUnitEconomics(school.tuition, school.capacity, facTotal, school.costs.annualDepreciation.total);
                    const modelFacTotal = school.budget.modelFacPerStudent * school.capacity;
                    const modelCapexAnn = school.budget.capexBudget / 10;
                    const ueModel = calculateUnitEconomics(school.tuition, school.capacity, modelFacTotal, modelCapexAnn);
                    return { model: ueModel.marginPct, actual: ue.marginPct, target: getTargetPct(school.tuition) };
                  };

                  // Type-level summary (capacity-weighted avg margins)
                  const marginTypeData = mTypeOrder.map(type => {
                    const ts = schools.filter(s => s.schoolType === type);
                    if (ts.length === 0) return null;
                    const totalCap = Math.max(ts.reduce((s, sc) => s + sc.capacity, 0), 1);
                    const wModel = ts.reduce((s, sc) => { const m = computeMargins(sc); return s + m.model * sc.capacity; }, 0) / totalCap;
                    const wActual = ts.reduce((s, sc) => { const m = computeMargins(sc); return s + m.actual * sc.capacity; }, 0) / totalCap;
                    const wTarget = Math.round(ts.reduce((s, sc) => s + getTargetPct(sc.tuition) * sc.capacity, 0) / totalCap);
                    return {
                      name: `${schoolTypeLabels[type]} (${ts.length})`,
                      type,
                      model: parseFloat(wModel.toFixed(1)),
                      actual: parseFloat(wActual.toFixed(1)),
                      target: wTarget,
                      count: ts.length,
                    };
                  }).filter((d): d is NonNullable<typeof d> => d !== null);

                  // Expanded school data
                  const expandedMarginSchools = expandedMarginType ? schools
                    .filter(s => s.schoolType === expandedMarginType)
                    .map(s => {
                      const m = computeMargins(s);
                      return {
                        name: s.displayName.length > 16 ? s.displayName.replace('Alpha ', 'A. ') : s.displayName,
                        model: parseFloat(m.model.toFixed(1)),
                        actual: parseFloat(m.actual.toFixed(1)),
                        target: m.target,
                        school: s,
                      };
                    }).sort((a, b) => a.actual - b.actual)
                  : [];

                  return (
                    <div className="table-card rounded-xl overflow-hidden">
                      <div className="px-5 py-3 bg-slate-800 text-white">
                        <h3 className="font-semibold">Model vs Actual Margin (at Capacity)</h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Weighted avg by school type. Blue = model margin %. Colored = actual (green/amber/red by target). <span className="text-blue-400">Click to drill in.</span>
                        </p>
                      </div>
                      <div className="p-4" style={{ height: marginTypeData.length * 50 + 60 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marginTypeData} layout="vertical" margin={{ left: 170, right: 40, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v: number) => `${v}%`} stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} tickLine={false} />
                            <Tooltip
                              formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
                            <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} />
                            <Bar dataKey="model" name="Model Margin %" fill="#3b82f6" barSize={14} radius={[0, 3, 3, 0]}
                              onClick={(_d: any, idx: number) => { const e = marginTypeData[idx]; if (e) setExpandedMarginType(expandedMarginType === e.type ? null : e.type); }}
                              style={{ cursor: 'pointer' }}
                            />
                            <Bar dataKey="actual" name="Actual Margin %" barSize={14} radius={[0, 3, 3, 0]}
                              onClick={(_d: any, idx: number) => { const e = marginTypeData[idx]; if (e) setExpandedMarginType(expandedMarginType === e.type ? null : e.type); }}
                              style={{ cursor: 'pointer' }}
                            >
                              {marginTypeData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.actual >= entry.target ? '#22c55e' : entry.actual >= 0 ? '#f59e0b' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {expandedMarginType && expandedMarginSchools.length > 0 && (
                        <div className="border-t border-slate-700">
                          <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-800/30 flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-blue-300 text-sm">{schoolTypeLabels[expandedMarginType]} — School Detail</h4>
                              <p className="text-[11px] text-slate-400">Click a bar to open full school profile.</p>
                            </div>
                            <button onClick={() => setExpandedMarginType(null)} className="text-slate-400 hover:text-white text-lg leading-none px-2 py-1 rounded hover:bg-slate-700">x</button>
                          </div>
                          <div className="p-4" style={{ height: Math.max(180, expandedMarginSchools.length * 36 + 40) }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={expandedMarginSchools} layout="vertical" margin={{ left: 170, right: 40, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" tickFormatter={(v: number) => `${v}%`} stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                                <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#cbd5e1', fontSize: 11 }} tickLine={false} />
                                <Tooltip
                                  formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                                  labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                                />
                                <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} />
                                <Bar dataKey="model" name="Model Margin %" fill="#3b82f6" barSize={12} radius={[0, 3, 3, 0]}
                                  onClick={(_d: any, idx: number) => { const s = expandedMarginSchools[idx]?.school; if (s) setSelectedSchool(s); }}
                                  style={{ cursor: 'pointer' }}
                                />
                                <Bar dataKey="actual" name="Actual Margin %" barSize={12} radius={[0, 3, 3, 0]}
                                  onClick={(_d: any, idx: number) => { const s = expandedMarginSchools[idx]?.school; if (s) setSelectedSchool(s); }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {expandedMarginSchools.map((entry, idx) => (
                                    <Cell key={idx} fill={entry.actual >= entry.target ? '#22c55e' : entry.actual >= 0 ? '#f59e0b' : '#ef4444'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* === Target Achievability by Tuition Tier === */}
                {(() => {
                  const tiers: TuitionTier[] = ['premium', 'standard', 'value', 'economy'];
                  const tierData = tiers.map(tier => {
                    const ts = schools.filter(s => s.tuitionTier === tier);
                    if (ts.length === 0) return null;
                    const totalCap = Math.max(ts.reduce((s, sc) => s + sc.capacity, 0), 1);
                    const wMargin = ts.reduce((s, sc) => {
                      const facTotal = sc.costs.lease.total + sc.costs.fixedFacilities.total +
                        sc.costs.variableFacilities.total + sc.costs.studentServices.total;
                      const ue = calculateUnitEconomics(sc.tuition, sc.capacity, facTotal, sc.costs.annualDepreciation.total);
                      return s + ue.marginPct * sc.capacity;
                    }, 0) / totalCap;
                    const target = getTargetPct(ts[0].tuition);
                    const passCount = ts.filter(sc => {
                      const facTotal = sc.costs.lease.total + sc.costs.fixedFacilities.total +
                        sc.costs.variableFacilities.total + sc.costs.studentServices.total;
                      const ue = calculateUnitEconomics(sc.tuition, sc.capacity, facTotal, sc.costs.annualDepreciation.total);
                      return ue.marginPct >= getTargetPct(sc.tuition);
                    }).length;
                    return { tier, label: tuitionTierLabels[tier], avgMargin: parseFloat(wMargin.toFixed(1)), target, passCount, total: ts.length, totalCap };
                  }).filter((d): d is NonNullable<typeof d> => d !== null);

                  const totalCan = tierData.reduce((s, t) => s + t.passCount, 0);
                  const totalAll = tierData.reduce((s, t) => s + t.total, 0);

                  // Expanded tier schools
                  const expandedTierSchools = expandedTier ? schools
                    .filter(s => s.tuitionTier === expandedTier)
                    .map(s => {
                      const facTotal = s.costs.lease.total + s.costs.fixedFacilities.total +
                        s.costs.variableFacilities.total + s.costs.studentServices.total;
                      const ue = calculateUnitEconomics(s.tuition, s.capacity, facTotal, s.costs.annualDepreciation.total);
                      return { school: s, margin: ue.marginPct, target: getTargetPct(s.tuition) };
                    }).sort((a, b) => b.margin - a.margin)
                  : [];

                  return (
                    <div className="table-card rounded-xl overflow-hidden">
                      <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Target Achievability by Tuition Tier</h3>
                          <p className="text-xs text-slate-300 mt-0.5">Weighted avg margin at capacity vs tier target. <span className="text-blue-400">Click a row to see schools.</span></p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{totalCan}<span className="text-slate-400 font-normal">/{totalAll}</span></div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">at target</div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Tuition Tier</th>
                              <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-400">Schools</th>
                              <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-400">Seats</th>
                              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400">Target</th>
                              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400">Avg Margin</th>
                              <th className="px-4 py-2.5 text-xs font-medium text-slate-400" style={{ width: '30%' }}>vs Target</th>
                              <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-400">Pass Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tierData.map(t => {
                              const isExpanded = expandedTier === t.tier;
                              const gap = t.avgMargin - t.target;
                              const barWidth = Math.min(Math.abs(t.avgMargin) / 30 * 100, 100);
                              return (
                                <tr key={t.tier}
                                  className={`border-b border-slate-700/50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-900/20' : 'hover:bg-slate-800/50'}`}
                                  onClick={() => setExpandedTier(isExpanded ? null : t.tier)}
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-white text-sm">{t.label}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-slate-300">{t.total}</td>
                                  <td className="px-4 py-3 text-center text-slate-300">{t.totalCap}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="px-2 py-0.5 rounded text-xs bg-blue-900/40 text-blue-300">{t.target}%</span>
                                  </td>
                                  <td className={`px-4 py-3 text-right font-bold text-base ${t.avgMargin >= t.target ? 'text-green-400' : t.avgMargin >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {t.avgMargin >= 0 ? '+' : ''}{t.avgMargin}%
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden relative">
                                        <div
                                          className={`h-full rounded-full ${t.avgMargin >= t.target ? 'bg-green-500' : t.avgMargin >= 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                                          style={{ width: `${barWidth}%` }}
                                        />
                                      </div>
                                      <span className={`text-xs font-medium min-w-[40px] text-right ${gap >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {gap >= 0 ? '+' : ''}{gap.toFixed(0)}pp
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`font-bold ${t.passCount === t.total ? 'text-green-400' : t.passCount > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                      {t.passCount}/{t.total}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Expanded tier detail */}
                      {expandedTier && expandedTierSchools.length > 0 && (
                        <div className="border-t border-slate-700">
                          <div className="px-5 py-3 bg-blue-900/20 border-b border-blue-800/30 flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-blue-300 text-sm">{tuitionTierLabels[expandedTier]} — Schools</h4>
                              <p className="text-[11px] text-slate-400">Click a school to open full profile.</p>
                            </div>
                            <button onClick={() => setExpandedTier(null)} className="text-slate-400 hover:text-white text-lg leading-none px-2 py-1 rounded hover:bg-slate-700">x</button>
                          </div>
                          <div className="px-5 py-3 space-y-1.5">
                            {expandedTierSchools.map(s => {
                              const atTarget = s.margin >= s.target;
                              const isPos = s.margin >= 0;
                              return (
                                <div key={s.school.id}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors"
                                  onClick={() => setSelectedSchool(s.school)}
                                >
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${atTarget ? 'bg-green-500' : isPos ? 'bg-amber-500' : 'bg-red-500'}`} />
                                  <div className="flex-1 text-sm text-slate-200 font-medium">{s.school.displayName}</div>
                                  <div className="text-xs text-slate-400">{s.school.capacity} seats</div>
                                  <div className={`text-sm font-bold min-w-[60px] text-right ${atTarget ? 'text-green-400' : isPos ? 'text-amber-400' : 'text-red-400'}`}>
                                    {s.margin >= 0 ? '+' : ''}{s.margin.toFixed(1)}%
                                  </div>
                                  <div className="text-[10px] text-slate-500 min-w-[30px] text-right">/ {s.target}%</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Unit Economics Table */}
                <div className="table-card rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800 text-white">
                    <h3 className="font-semibold">School-by-School Unit Economics (at Capacity)</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Full P&amp;L per student at capacity using approved model formulas. All costs per student.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="px-2 py-1 text-left text-xs font-medium text-slate-400 sticky left-0 z-10" rowSpan={2} style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>School</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-slate-400" rowSpan={2}>Cap.</th>
                          <th className="px-2 py-1 text-right text-xs font-bold text-green-800 bg-green-50 border-l" rowSpan={2}>Revenue<br/>/Student</th>
                          <th className="px-2 py-1 text-center text-xs font-bold text-gray-700 bg-gray-100 border-l" colSpan={6}>Costs / Student</th>
                          <th className="px-2 py-1 text-center text-xs font-bold text-indigo-800 bg-indigo-50 border-l" colSpan={4}>Margin at Capacity</th>
                          <th className="px-2 py-1 text-center text-xs font-bold text-amber-800 bg-amber-50 border-l" rowSpan={2}>Target</th>
                        </tr>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-300 border-l">Staffing</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-blue-700">Facilities</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-700">CapEx Depr.</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-violet-700">Programs</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-orange-700">Misc</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-rose-700">Timeback</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-blue-600 bg-blue-50 border-l">Model %</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-bold text-indigo-700 bg-indigo-100 border-l-2 border-indigo-300">Actual %</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-300">Gap</th>
                          <th className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-300">Driver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                        {[...schools].sort((a, b) => {
                          const ueA = calculateUnitEconomics(a.tuition, a.capacity,
                            a.costs.lease.total + a.costs.fixedFacilities.total + a.costs.variableFacilities.total + a.costs.studentServices.total,
                            a.costs.annualDepreciation.total);
                          const ueB = calculateUnitEconomics(b.tuition, b.capacity,
                            b.costs.lease.total + b.costs.fixedFacilities.total + b.costs.variableFacilities.total + b.costs.studentServices.total,
                            b.costs.annualDepreciation.total);
                          return ueA.marginPct - ueB.marginPct;
                        }).map((school, idx) => {
                          const facTotal = school.costs.lease.total + school.costs.fixedFacilities.total + school.costs.variableFacilities.total + school.costs.studentServices.total;
                          const ue = calculateUnitEconomics(school.tuition, school.capacity, facTotal, school.costs.annualDepreciation.total);
                          // Model margin: using budgeted facility costs instead of actual
                          const modelFacTotal = school.budget.modelFacPerStudent * school.capacity;
                          const modelCapexAnn = school.budget.capexBudget / 10; // 10yr depr
                          const ueModel = calculateUnitEconomics(school.tuition, school.capacity, modelFacTotal, modelCapexAnn);
                          const target = getTargetPct(school.tuition);
                          const hitsTarget = ue.marginPct >= target;
                          const marginGap = ue.marginPct - ueModel.marginPct;
                          const facGapPS = ue.facilitiesPerStudent - ueModel.facilitiesPerStudent;

                return (
                            <tr key={school.id} className={`hover:bg-slate-700/40 cursor-pointer `} onClick={() => setSelectedSchool(school)}>
                              <td className={`px-2 py-2 sticky left-0 z-10 ${idx % 2 === 1 ? '' : ''}`} style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>
                                <div className="font-medium text-slate-100 text-sm">{school.displayName}</div>
                                <div className="text-[11px] text-slate-400">{schoolTypeLabels[school.schoolType]} | ${school.tuition.toLocaleString()}</div>
                    </td>
                              <td className="px-2 py-2 text-center">{school.capacity}</td>
                              <td className="px-2 py-2 text-right text-green-400 font-medium border-l">{fmt(ue.tuition)}</td>
                              <td className="px-2 py-2 text-right border-l">{fmt(ue.staffingPerStudent)}</td>
                              <td className="px-2 py-2 text-right text-blue-700">{fmt(ue.facilitiesPerStudent)}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{fmt(ue.capexPerStudent)}</td>
                              <td className="px-2 py-2 text-right text-violet-700">{fmt(ue.programsPerStudent)}</td>
                              <td className="px-2 py-2 text-right text-orange-600">{fmt(ue.miscPerStudent)}</td>
                              <td className="px-2 py-2 text-right text-rose-600">{fmt(ue.timebackPerStudent)}</td>
                              {/* Model Margin */}
                              <td className={`px-2 py-2 text-right border-l ${ueModel.marginPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {ueModel.marginPct >= 0 ? '+' : ''}{ueModel.marginPct.toFixed(1)}%
                    </td>
                              {/* Actual Margin — answer column */}
                              <td className={`px-2 py-2 text-right answer-glow font-bold text-base ${ue.marginPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {ue.marginPct >= 0 ? '+' : ''}{ue.marginPct.toFixed(1)}%
                    </td>
                              {/* Gap */}
                              <td className={`px-2 py-2 text-right text-sm ${marginGap >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {marginGap >= 0 ? '+' : ''}{marginGap.toFixed(1)}
                    </td>
                              {/* Driver */}
                              <td className="px-2 py-2 text-right text-[11px] text-slate-400">
                                {Math.abs(facGapPS) > 500 ? (
                                  <span className={facGapPS > 0 ? 'text-red-500' : 'text-green-500'}>
                                    Fac {facGapPS > 0 ? '+' : ''}{fmt(facGapPS)}
                      </span>
                                ) : '—'}
                    </td>
                              <td className="px-2 py-2 text-center border-l">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${hitsTarget ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {target}%{hitsTarget ? ' ✓' : ' ✗'}
                  </span>
                </td>
              </tr>
                          );
                        })}
            </tbody>
          </table>
        </div>
      </div>

                {/* Break-Even Analysis */}
                <div className="table-card rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-slate-800 text-white">
                    <h3 className="font-semibold">Break-Even &amp; Target Analysis</h3>
                    <p className="text-xs text-slate-300 mt-0.5">Students needed for breakeven (0% margin) and tier-specific target margin. Uses actual facilities costs + model staffing/programs/timeback formulas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 sticky left-0 z-10" style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>School</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-400">Capacity</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-400">Current</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-amber-700 bg-amber-50">Students to B/E</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-blue-700 bg-blue-50">Students to Target</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-400">Target %</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-green-400 bg-green-50">Margin @ Cap</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-green-400 bg-green-50">Margin % @ Cap</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-400">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                        {[...schools].sort((a, b) => a.capacity - b.capacity).map((school) => {
                          const facTotal = school.costs.lease.total + school.costs.fixedFacilities.total + school.costs.variableFacilities.total + school.costs.studentServices.total;
                          const capexAnn = school.costs.annualDepreciation.total;
                          const target = getTargetPct(school.tuition);

                          // Binary search for breakeven and target students
                          let beStudents = 0;
                          let targetStudents = 0;
                          for (let s = 1; s <= school.capacity * 2; s++) {
                            const ue = calculateUnitEconomics(school.tuition, s, facTotal, capexAnn);
                            if (beStudents === 0 && ue.margin >= 0) beStudents = s;
                            if (targetStudents === 0 && ue.marginPct >= target) targetStudents = s;
                            if (beStudents > 0 && targetStudents > 0) break;
                          }

                          const ueAtCap = calculateUnitEconomics(school.tuition, school.capacity, facTotal, capexAnn);
                          const canBE = beStudents > 0 && beStudents <= school.capacity;
                          const canTarget = targetStudents > 0 && targetStudents <= school.capacity;
                          const gapToBE = beStudents > 0 ? beStudents - school.currentEnrollment : school.capacity;

                return (
                            <tr key={school.id} className="hover:bg-slate-700/40 cursor-pointer" onClick={() => setSelectedSchool(school)}>
                              <td className="px-2 py-2">
                                <div className="font-medium text-slate-100 text-sm">{school.displayName}</div>
                                <div className="text-[11px] text-slate-400">{schoolTypeLabels[school.schoolType]} | ${school.tuition.toLocaleString()}</div>
                    </td>
                              <td className="px-2 py-2 text-center">{school.capacity}</td>
                              <td className="px-2 py-2 text-center">{school.currentEnrollment}</td>
                              <td className="px-2 py-2 text-center">
                                {beStudents > 0 ? (
                                  <div>
                                    <span className={canBE ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>{beStudents}</span>
                                    {gapToBE > 0 && <div className="text-[10px] text-slate-400">+{gapToBE} needed</div>}
                                  </div>
                                ) : <span className="text-red-500 text-xs">N/A</span>}
                    </td>
                              <td className="px-2 py-2 text-center">
                                {targetStudents > 0 ? (
                                  <div>
                                    <span className={canTarget ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>{targetStudents}</span>
                                    {!canTarget && <div className="text-[10px] text-red-500">Exceeds cap!</div>}
                                  </div>
                                ) : <span className="text-red-500 text-xs">N/A</span>}
                    </td>
                              <td className="px-2 py-2 text-center">
                                <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{target}%</span>
                              </td>
                              <td className={`px-2 py-2 text-right font-medium ${ueAtCap.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(ueAtCap.margin)}
                              </td>
                              <td className={`px-2 py-2 text-right font-bold ${ueAtCap.marginPct >= target ? 'text-green-400' : ueAtCap.marginPct >= 0 ? 'text-amber-600' : 'text-red-400'}`}>
                                {ueAtCap.marginPct >= 0 ? '+' : ''}{ueAtCap.marginPct.toFixed(1)}%
                              </td>
                              <td className="px-2 py-2 text-center">
                                {ueAtCap.marginPct >= target ? (
                                  <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">At Target</span>
                                ) : ueAtCap.marginPct >= 0 ? (
                                  <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Below Target</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">Loss at Cap</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

                <NewSchoolCalculator summary={summary} />
              </>
            );
          })()}
        </div>
      )}


      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* School-by-School Category Table */}
          {(() => {
            const bySqft = overviewBasis === 'sqft';
            const atCap = overviewBasis === 'capacity';
            const getDivisor = (s: SchoolData) =>
              bySqft ? Math.max(s.sqft, 1) : atCap ? Math.max(s.capacity, 1) : Math.max(s.currentEnrollment, 1);
            const basisLabel = bySqft ? 'per sq ft' : atCap ? 'per student (capacity)' : 'per student (current)';
            const basisColLabel = bySqft ? 'Sq Ft' : 'Students';
            const fmt = (v: number) => bySqft ? `$${Math.round(v)}` : `$${Math.round(v).toLocaleString()}`;
            const showPct = !bySqft;
            const pctFmt = (v: number, tuition: number) => tuition > 0 ? `${((v / tuition) * 100).toFixed(1)}%` : '—';

            const getSchoolVal = (s: SchoolData, key: string) => {
              const d = getDivisor(s);
              const lease = s.costs.lease.total / d;
              const capex = s.costs.annualDepreciation.total / d;
              const fixed = s.costs.fixedFacilities.total / d;
              const vfac = s.costs.variableFacilities.total / d;
              const svc = s.costs.studentServices.total / d;
              if (key === 'name') return 0; // handled separately
              if (key === 'students') return bySqft ? s.sqft : atCap ? s.capacity : s.currentEnrollment;
              if (key === 'lease') return lease;
              if (key === 'capexTotal') return s.costs.capexBuildout;
              if (key === 'capexPS') return capex;
              if (key === 'leaseCapex') return lease + capex;
              if (key === 'fixedFac') return fixed;
              if (key === 'varFac') return vfac;
              if (key === 'svc') return svc;
              if (key === 'facTotal') return fixed + vfac + svc;
              if (key === 'total') return lease + capex + fixed + vfac + svc;
              return s.costs.grandTotal / d;
            };
            const sorted = [...sortedSchools].sort((a, b) => {
              if (overviewSort.key === 'name') return overviewSort.dir === 'asc' ? a.displayName.localeCompare(b.displayName) : b.displayName.localeCompare(a.displayName);
              const va = getSchoolVal(a, overviewSort.key);
              const vb = getSchoolVal(b, overviewSort.key);
              return overviewSort.dir === 'desc' ? vb - va : va - vb;
            });

            // Portfolio totals
            const portfolioDivisor = bySqft
              ? Math.max(summary.totalSqft, 1)
              : atCap ? Math.max(summary.totalCapacity, 1) : Math.max(summary.totalEnrollment, 1);

            // Weighted average tuition for portfolio % display
            const weightedTuition = schools.length > 0
              ? schools.reduce((s, sc) => s + sc.tuition * (atCap ? sc.capacity : Math.max(sc.currentEnrollment, 1)), 0) / schools.reduce((s, sc) => s + (atCap ? sc.capacity : Math.max(sc.currentEnrollment, 1)), 0)
              : 1;

            // Cell helper: dollar + % of tuition underneath
            const DollarPctCell = ({ val, tuition, bg, bold }: { val: number; tuition: number; bg?: string; bold?: boolean }) => (
              <td className={`px-2 py-2 text-right ${bg || ''}`}>
                <div className={bold ? 'font-semibold' : ''}>{fmt(val)}</div>
                {showPct && <div className="text-[10px] text-slate-400">{pctFmt(val, tuition)}</div>}
              </td>
            );

            // School type filter pills
            const typeOptions: { key: SchoolType | 'all'; label: string }[] = [
              { key: 'all', label: 'All' },
              ...Object.entries(schoolTypeLabels).map(([k, l]) => ({ key: k as SchoolType, label: l })),
            ];

  return (
              <div className="table-card rounded-xl overflow-hidden mb-6">
                <div className="px-5 py-4 bg-slate-800 text-white">
                  {/* Title row with type filter pills */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="font-semibold text-white mr-2">School-by-School</h2>
                    <div className="flex flex-wrap gap-1">
                      {typeOptions.map(opt => (
            <button
                          key={opt.key}
                          onClick={() => setSchoolTypeFilter(opt.key)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            schoolTypeFilter === opt.key
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                          }`}
                        >
                          {opt.label}
            </button>
          ))}
        </div>
      </div>
                  {/* Basis toggle */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">Category costs {basisLabel}. Click row for detail. Click headers to sort.</p>
                    <div className="flex bg-slate-600/50 rounded-lg p-0.5">
                      <button onClick={() => setOverviewBasis('current')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${overviewBasis === 'current' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>Current</button>
                      <button onClick={() => setOverviewBasis('capacity')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${overviewBasis === 'capacity' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>Capacity</button>
                      <button onClick={() => setOverviewBasis('sqft')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${overviewBasis === 'sqft' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}>Per Sq Ft</button>
        </div>
            </div>
          </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    {/* === Two-row header === */}
                    <thead>
                      {/* Group header row — sortable */}
                      <tr className="bg-gray-100 border-b">
                        <th className="px-2 py-1 text-left text-xs font-medium text-slate-400 sticky left-0 z-10 cursor-pointer select-none hover:bg-gray-200" rowSpan={2} style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}} onClick={() => toggleSort(setOverviewSort)('name')}>School{overviewSort.key==='name'?(overviewSort.dir==='asc'?' ▲':' ▼'):''}</th>
                        <th className="px-2 py-1 text-center text-xs font-medium text-slate-400 cursor-pointer select-none hover:bg-gray-200" rowSpan={2} onClick={() => toggleSort(setOverviewSort)('students')}>{basisColLabel}{overviewSort.key==='students'?(overviewSort.dir==='asc'?' ▲':' ▼'):''}</th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-blue-700 bg-blue-50 cursor-pointer select-none hover:bg-blue-100" rowSpan={2} onClick={() => toggleSort(setOverviewSort)('lease')}>Lease/Student{overviewSort.key==='lease'?(overviewSort.dir==='asc'?' ▲':' ▼'):''}</th>
                        <th className="px-2 py-1 text-center text-xs font-bold text-slate-800 bg-slate-100 border-l border-slate-300" colSpan={4}>CapEx</th>
                        <th className="px-2 py-1 text-center text-xs font-bold text-indigo-800 bg-indigo-50 border-l border-indigo-200 cursor-pointer select-none hover:bg-indigo-100" rowSpan={2} onClick={() => toggleSort(setOverviewSort)('leaseCapex')}>Lease+Capex{overviewSort.key==='leaseCapex'?(overviewSort.dir==='asc'?' ▲':' ▼'):''}</th>
                        <th className="px-2 py-1 text-center text-xs font-bold text-emerald-800 bg-emerald-50 border-l border-emerald-200" colSpan={4}>Facilities Costs / Student</th>
                        <th className="px-2 py-1 text-center text-xs font-bold text-indigo-900 bg-indigo-100 border-l-2 border-indigo-300 cursor-pointer select-none hover:bg-indigo-200" rowSpan={2} onClick={() => toggleSort(setOverviewSort)('total')}>Total{overviewSort.key==='total'?(overviewSort.dir==='asc'?' ▲':' ▼'):''}<br/><span className="font-normal text-[10px] text-indigo-500">(ex-HC)</span></th>
                      </tr>
                      {/* Detail header row */}
                      <tr className="bg-gray-50 border-b">
                        {/* CapEx sub-headers */}
                        <th className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-600 bg-slate-50 border-l border-slate-300">Total</th>
                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-slate-600 bg-slate-50">Depr Period</th>
                        <th className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-600 bg-slate-50">Annual</th>
                        <th className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-700 bg-slate-100">Per Student</th>
                        {/* Facilities sub-headers */}
                        <th className="px-2 py-1.5 text-right text-[11px] font-medium text-violet-700 bg-violet-50 border-l border-emerald-200">Fixed</th>
                        <th className="px-2 py-1.5 text-right text-[11px] font-medium text-teal-700 bg-teal-50">Variable</th>
                        <th className="px-2 py-1.5 text-right text-[11px] font-medium text-orange-700 bg-orange-50">Student Svc</th>
                        <th className="px-2 py-1.5 text-right text-[11px] font-medium text-emerald-800 bg-emerald-100">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sorted.map((school, idx) => {
                        const div = getDivisor(school);
                        const tuition = school.tuition;
                        const leasePerUnit = school.costs.lease.total / div;
                        const totalCapex = school.costs.capexBuildout;
                        const annualDepr = school.costs.annualDepreciation.total;
                        const deprPeriod = annualDepr > 0 ? totalCapex / annualDepr : 0;
                        const capexPerUnit = annualDepr / div;
                        const leaseCapex = leasePerUnit + capexPerUnit;
                        const fixedFac = school.costs.fixedFacilities.total / div;
                        const varFac = school.costs.variableFacilities.total / div;
                        const svc = school.costs.studentServices.total / div;
                        const facTotal = fixedFac + varFac + svc;
                        const basisVal = bySqft ? school.sqft : atCap ? school.capacity : school.currentEnrollment;

                        return (
                          <tr key={school.id} className={`hover:bg-slate-700/40 cursor-pointer `} onClick={() => setSelectedSchool(school)}>
                            <td className={`px-2 py-2 sticky left-0 z-10 ${idx % 2 === 1 ? '' : ''}`} style={{boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)'}}>
                              <div className="font-medium text-slate-100 text-sm">{school.displayName}</div>
                              <div className="text-[11px] text-slate-400">
                                {schoolTypeLabels[school.schoolType]} | ${tuition.toLocaleString()} |{' '}
                                <span className={school.isOperating ? 'text-green-400' : 'text-slate-500'}>{school.isOperating ? 'Operating' : 'Pre-Opening'}</span>
                </div>
                            </td>
                            <td className="px-2 py-2 text-center text-sm">{basisVal.toLocaleString()}</td>
                            {/* Lease */}
                            <DollarPctCell val={leasePerUnit} tuition={tuition} bg="bg-blue-50/30" />
                            {/* CapEx group */}
                            <td className="px-2 py-2 text-right text-red-400 border-l border-slate-200">{formatCurrency(totalCapex)}</td>
                            <td className="px-2 py-2 text-center text-slate-600">{deprPeriod > 0 ? `${deprPeriod.toFixed(0)} yr` : '—'}</td>
                            <td className="px-2 py-2 text-right text-slate-700">{formatCurrency(annualDepr)}</td>
                            <DollarPctCell val={capexPerUnit} tuition={tuition} bg="bg-slate-50/40" bold />
                            {/* Lease + Capex */}
                            <DollarPctCell val={leaseCapex} tuition={tuition} bg="bg-indigo-50/30" bold />
                            {/* Facilities group */}
                            <DollarPctCell val={fixedFac} tuition={tuition} bg="bg-violet-50/20" />
                            <DollarPctCell val={varFac} tuition={tuition} bg="bg-teal-50/20" />
                            <DollarPctCell val={svc} tuition={tuition} bg="bg-orange-50/20" />
                            <DollarPctCell val={facTotal} tuition={tuition} bg="bg-emerald-50/30" bold />
                            {/* Grand Total = answer column */}
                            <DollarPctCell val={leaseCapex + facTotal} tuition={tuition} bg="answer-glow" bold />
                          </tr>
                        );
                      })}
                      {/* Portfolio Total Row */}
                      {(() => {
                        const pLease = summary.totalLease / portfolioDivisor;
                        const pAnnDepr = summary.totalAnnualDepreciation / portfolioDivisor;
                        const pLeaseCapex = pLease + pAnnDepr;
                        const pFixed = summary.totalFixedFacilities / portfolioDivisor;
                        const pVar = summary.totalVariableFacilities / portfolioDivisor;
                        const pSvc = summary.totalStudentServices / portfolioDivisor;
                        const pFacTotal = pFixed + pVar + pSvc;
                        const pDeprPeriod = summary.totalAnnualDepreciation > 0 ? summary.totalCapexBuildout / summary.totalAnnualDepreciation : 0;
                        const pTuition = weightedTuition;
                        return (
                          <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                            <td className="px-2 py-3">PORTFOLIO</td>
                            <td className="px-2 py-3 text-center">{(bySqft ? summary.totalSqft : atCap ? summary.totalCapacity : summary.totalEnrollment).toLocaleString()}</td>
                            <DollarPctCell val={pLease} tuition={pTuition} bg="bg-blue-100/40" />
                            <td className="px-2 py-3 text-right text-red-400 border-l border-slate-300">{formatCurrency(summary.totalCapexBuildout)}</td>
                            <td className="px-2 py-3 text-center text-slate-600">{pDeprPeriod > 0 ? `${pDeprPeriod.toFixed(0)} yr` : '—'}</td>
                            <td className="px-2 py-3 text-right text-slate-700">{formatCurrency(summary.totalAnnualDepreciation)}</td>
                            <DollarPctCell val={pAnnDepr} tuition={pTuition} bg="bg-slate-100/50" bold />
                            <DollarPctCell val={pLeaseCapex} tuition={pTuition} bg="bg-indigo-100/40" bold />
                            <DollarPctCell val={pFixed} tuition={pTuition} bg="bg-violet-100/30" />
                            <DollarPctCell val={pVar} tuition={pTuition} bg="bg-teal-100/30" />
                            <DollarPctCell val={pSvc} tuition={pTuition} bg="bg-orange-100/30" />
                            <DollarPctCell val={pFacTotal} tuition={pTuition} bg="bg-emerald-100/40" bold />
                            <DollarPctCell val={pLeaseCapex + pFacTotal} tuition={pTuition} bg="answer-glow" bold />
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Pie Charts: collapsible */}
          <div className="mb-4">
            <button onClick={() => setShowCharts(!showCharts)} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 bg-slate-800/50 px-3 py-1.5 rounded-lg">
              {showCharts ? '▼ Hide Charts' : '▶ Show Cost Breakdown Charts'}
            </button>
            </div>
          {showCharts && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Facilities Costs Pie */}
            {(() => {
              const leaseCapexDepr = summary.totalLease + summary.totalAnnualDepreciation;
              const facFixed = summary.totalFixedFacilities;
              const facVariable = summary.totalVariableFacilities + summary.totalStudentServices;
              const facData = [
                { name: 'Lease + Capex (Depr.)', value: leaseCapexDepr, color: '#1e40af' },
                { name: 'Facilities Fixed', value: facFixed, color: '#7c3aed' },
                { name: 'Facilities Variable (incl. Student Svc)', value: facVariable, color: '#0d9488' },
              ];
              const renderLabel = ({ percent }: { percent: number }) =>
                `${(percent * 100).toFixed(0)}%`;
              return (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-white">Facilities Costs</div>
                    <div className="text-xs text-slate-400">{formatCurrency(leaseCapexDepr + facFixed + facVariable)} total</div>
          </div>
                  <div className="h-64 overflow-visible">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <Pie data={facData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={35} label={renderLabel} labelLine={false}>
                          {facData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
              </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs justify-center">
                    {facData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-300">{d.name}</span>
                        <span className="font-semibold">{formatCurrency(d.value)}</span>
                  </div>
                ))}
                </div>
              </div>
              );
            })()}

            {/* Annual Cost Breakdown Pie */}
            {(() => {
              const costData = summary.categoryBreakdown.map(cat => ({
                name: cat.category,
                value: cat.amount,
                color: cat.color,
              }));
              costData.push({ name: 'CapEx Buildout', value: summary.totalCapexBuildout, color: '#dc2626' });
              const renderLabel = ({ percent }: { percent: number }) =>
                percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '';
              return (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-white">Annual Cost Breakdown</div>
                    <div className="text-sm text-slate-400">{formatCurrency(summary.grandTotal)} annual + {formatCurrency(summary.totalCapexBuildout)} CapEx</div>
            </div>
                  <div className="h-64 overflow-visible">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <Pie data={costData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={35} label={renderLabel} labelLine={false}>
                          {costData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
            </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs justify-center">
                    {costData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-300">{d.name}</span>
                        <span className="font-semibold">{formatCurrency(d.value)}</span>
            </div>
                    ))}
            </div>
          </div>
              );
            })()}
          </div>}

          {/* Headline KPIs — at bottom */}
          <div className="bg-slate-800 rounded-xl p-5 mb-6 text-white shadow-lg">
            <div className="grid grid-cols-5 gap-6">
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Annual Fac. Cost</div>
                <div className="text-2xl font-bold text-white mt-1">{formatCurrency(summary.grandTotal)}</div>
                <div className="text-xs text-slate-500">{costVsRevenuePct}% of current revenue</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Current Revenue</div>
                <div className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(summary.totalRevenueCurrent)}</div>
                <div className="text-xs text-slate-500">{summary.totalEnrollment} students enrolled</div>
            </div>
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Utilization</div>
                <div className={`text-2xl font-bold mt-1 ${summary.avgUtilization < 50 ? 'text-red-400' : 'text-amber-400'}`}>{summary.avgUtilization.toFixed(0)}%</div>
                <div className="text-xs text-slate-500">{emptySeats.toLocaleString()} empty seats</div>
            </div>
            <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">CapEx Overrun</div>
                <div className={`text-2xl font-bold mt-1 ${summary.totalCapexDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {summary.totalCapexDelta > 0 ? '+' : ''}{formatCurrency(summary.totalCapexDelta)}
                      </div>
                <div className="text-xs text-slate-500">{summary.totalCapexDeltaPct > 0 ? '+' : ''}{summary.totalCapexDeltaPct.toFixed(0)}% vs approved</div>
                  </div>
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Revenue at Capacity</div>
                <div className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(summary.totalRevenueAtCapacity)}</div>
                <div className="text-xs text-slate-500">Fac = {summary.totalRevenueAtCapacity > 0 ? ((summary.grandTotal / summary.totalRevenueAtCapacity) * 100).toFixed(0) : 0}% at cap</div>
              </div>
            </div>
          </div>
        </>
      )}

      </div>

      {/* School Detail Drawer — Verdict-led */}
      {selectedSchool && (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-slate-900 text-slate-200 shadow-xl z-50 overflow-y-auto border-l border-slate-700">
          <div className="p-6">
            {/* Header with Verdict */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedSchool.displayName}</h2>
                <div className="text-sm text-slate-400">
                  {schoolTypeLabels[selectedSchool.schoolType]} | ${selectedSchool.tuition.toLocaleString()} tuition
                </div>
              </div>
              <button onClick={() => setSelectedSchool(null)} className="text-slate-400 hover:text-white text-xl">
                x
              </button>
            </div>

            {/* Verdict Banner */}
            <div className={`rounded-lg p-4 mb-6 ${
              selectedSchool.healthScore === 'green' ? 'bg-green-900/30 border border-green-700' :
              selectedSchool.healthScore === 'yellow' ? 'bg-amber-900/30 border border-amber-700' :
              selectedSchool.healthScore === 'red' ? 'bg-red-900/30 border border-red-700' :
              'bg-slate-800 border border-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <HealthBadge score={selectedSchool.healthScore} verdict={selectedSchool.healthVerdict} />
                <span className="text-sm text-slate-300">
                  {(selectedSchool.utilizationRate * 100).toFixed(0)}% utilized
                  {selectedSchool.isOperating && selectedSchool.breakeven.pctAt100Capacity <= selectedSchool.targetPct
                    ? ` | ${selectedSchool.targetPct}% target reachable at capacity`
                    : selectedSchool.isOperating
                      ? ` | ${selectedSchool.targetPct}% target NOT reachable at capacity`
                      : ''
                  }
                </span>
              </div>
              {selectedSchool.isOperating && (
                <div className="text-sm text-gray-700 space-y-1">
                  <div>
                    Current: {selectedSchool.currentEnrollment} students | {formatCurrency(selectedSchool.costs.grandTotal)} cost | {selectedSchool.metrics.pctOfTuitionCurrent.toFixed(0)}% of tuition
                  </div>
                  <div>
                    At capacity: {selectedSchool.capacity} students | {selectedSchool.breakeven.pctAt100Capacity.toFixed(0)}% of tuition
                  </div>
                  <div>
                    Revenue opportunity: <strong>{formatCurrency(selectedSchool.revenue.revenueGap)}</strong>
                  </div>
                  <div>
                    Marginal cost/student: <strong>{formatCurrency(selectedSchool.marginalCostPerStudent)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Sunk vs Controllable */}
              <div>
                <h3 className="font-medium mb-3">Cost Controllability</h3>
                <div className="flex h-4 rounded-lg overflow-hidden mb-2">
                  <div
                    className="bg-gray-400"
                    style={{ width: `${selectedSchool.costs.grandTotal > 0 ? (selectedSchool.sunkCosts / selectedSchool.costs.grandTotal) * 100 : 0}%` }}
                    title="Sunk"
                  />
                  <div
                    className="bg-blue-500"
                    style={{ width: `${selectedSchool.costs.grandTotal > 0 ? (selectedSchool.controllableCosts / selectedSchool.costs.grandTotal) * 100 : 0}%` }}
                    title="Controllable"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Sunk (Lease + Depr)</div>
                    <div className="font-bold">{formatCurrency(selectedSchool.sunkCosts)}</div>
                  </div>
                  <div className="bg-blue-900/30 rounded p-2">
                    <div className="text-xs text-slate-400">Controllable</div>
                    <div className="font-bold">{formatCurrency(selectedSchool.controllableCosts)}</div>
                  </div>
                </div>
              </div>

              {/* Revenue Context */}
              <div>
                <h3 className="font-medium mb-3">Revenue Context</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-green-900/30 rounded p-2">
                    <div className="text-xs text-slate-400">Current</div>
                    <div className="font-bold text-green-400">{formatCurrency(selectedSchool.revenue.current)}</div>
                  </div>
                  <div className="bg-green-900/30 rounded p-2">
                    <div className="text-xs text-slate-400">At Capacity</div>
                    <div className="font-bold text-green-400">{formatCurrency(selectedSchool.revenue.atCapacity)}</div>
                  </div>
                  <div className="bg-amber-900/30 rounded p-2">
                    <div className="text-xs text-slate-400">Gap</div>
                    <div className="font-bold text-amber-700">{formatCurrency(selectedSchool.revenue.revenueGap)}</div>
                  </div>
                </div>
              </div>

              {/* 6-Category Breakdown */}
              <div>
                <h3 className="font-medium mb-3">6-Category Breakdown</h3>
                <div className="space-y-2">
                  {[
                    { name: '1. Lease', value: selectedSchool.costs.lease.total, color: 'border-blue-600', subs: [{ n: 'Rent', v: selectedSchool.costs.lease.rent }] },
                    { name: '2. Fixed Facilities', value: selectedSchool.costs.fixedFacilities.total, color: 'border-violet-600', subs: [
                      { n: 'Security', v: selectedSchool.costs.fixedFacilities.security },
                      { n: 'IT Maintenance', v: selectedSchool.costs.fixedFacilities.itMaintenance },
                      { n: 'Landscaping', v: selectedSchool.costs.fixedFacilities.landscaping },
                    ]},
                    { name: '3. Variable Facilities', value: selectedSchool.costs.variableFacilities.total, color: 'border-teal-600', subs: [
                      { n: 'Repairs', v: selectedSchool.costs.variableFacilities.repairs },
                      { n: 'Utilities', v: selectedSchool.costs.variableFacilities.utilities },
                      { n: 'Janitorial', v: selectedSchool.costs.variableFacilities.janitorial },
                    ]},
                    { name: '4. Student Services', value: selectedSchool.costs.studentServices.total, color: 'border-orange-600', subs: [
                      { n: 'Food Services', v: selectedSchool.costs.studentServices.foodServices },
                      { n: 'Transportation', v: selectedSchool.costs.studentServices.transportation },
                    ]},
                    { name: '5. Annual Depreciation', value: selectedSchool.costs.annualDepreciation.total, color: 'border-slate-600', subs: [
                      { n: 'Depreciation', v: selectedSchool.costs.annualDepreciation.depreciation },
                    ]},
                    { name: '6. CapEx Buildout', value: selectedSchool.costs.capexBuildout, color: 'border-red-600', subs: [] },
                  ].map((cat) => (
                    <div key={cat.name} className={`border-l-4 ${cat.color} pl-3 py-1`}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.name}</span>
                        <span className="font-bold">{formatCurrency(cat.value)}</span>
                      </div>
                      {cat.subs.filter((s) => s.v > 0).map((s) => (
                        <div key={s.n} className="flex justify-between text-xs text-slate-400 mt-0.5">
                          <span>{s.n}</span>
                          <span>{formatCurrency(s.v)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget: Net Fac Fees */}
              <div>
                <h3 className="font-medium mb-3">Net Facilities Fees — Budget</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Model $/Seat:</span>
                    <span className="font-medium">{formatCurrency(selectedSchool.budget.modelNetFacPerStudent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Actual $/Seat:</span>
                    <span className="font-medium">{formatCurrency(selectedSchool.budget.actualNetFacPerStudent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Delta/Seat:</span>
                    <span className={`font-medium ${selectedSchool.budget.netFacDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedSchool.budget.netFacDelta > 0 ? '+' : ''}{formatCurrency(selectedSchool.budget.netFacDelta)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Total Variance:</span>
                    <span className={`font-bold ${selectedSchool.budget.totalVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedSchool.budget.totalVariance > 0 ? '+' : ''}{formatCurrency(selectedSchool.budget.totalVariance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* CapEx Budget vs Actual */}
              <div>
                <h3 className="font-medium mb-3">CapEx — Budget vs Actual</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Approved Budget:</span>
                    <span className="font-medium">{selectedSchool.budget.capexBudget > 0 ? formatCurrency(selectedSchool.budget.capexBudget) : <span className="text-slate-500">No model</span>}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Actual Buildout:</span>
                    <span className="font-medium text-red-400">{formatCurrency(selectedSchool.budget.capexBuildout)}</span>
                  </div>
                  {selectedSchool.budget.capexBudget > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">Variance:</span>
                      <span className={`font-bold ${selectedSchool.budget.capexDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {selectedSchool.budget.capexDelta > 0 ? '+' : ''}{formatCurrency(selectedSchool.budget.capexDelta)} ({selectedSchool.budget.capexDelta > 0 ? '+' : ''}{selectedSchool.budget.capexDeltaPct.toFixed(0)}%)
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-300">CapEx / Seat:</span>
                    <span className="font-medium">{formatCurrency(selectedSchool.budget.capexPerSeat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Annual Depreciation:</span>
                    <span className="font-medium text-slate-700">{formatCurrency(selectedSchool.budget.annualDepreciation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Depr. / Seat:</span>
                    <span className="font-medium">{formatCurrency(selectedSchool.budget.depreciationPerSeat)}</span>
                  </div>
                </div>
              </div>

              {/* Space Analysis */}
              <div>
                <h3 className="font-medium mb-3">Space Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Total Sq Ft:</span>
                    <span className="font-medium">{selectedSchool.sqft.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Sq Ft / Student:</span>
                    <span className="font-medium">{selectedSchool.sqftPerStudent.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Lease / Sq Ft:</span>
                    <span className="font-medium">${Math.round(selectedSchool.metrics.leasePerSqft)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Total / Sq Ft:</span>
                    <span className="font-medium">${Math.round(selectedSchool.metrics.costPerSqft)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesCapexDashboard;
