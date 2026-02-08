/**
 * Facilities & Capex Cost Analysis Dashboard
 *
 * 6-CATEGORY VIEW:
 * 1. Lease - Rent commitment (fixed, day 1)
 * 2. Fixed Facilities Cost - Security, IT, Landscaping (doesn't scale)
 * 3. Variable Facilities Cost - Janitorial, Utilities, Repairs (scales with students)
 * 4. Student Services - Food Services, Transportation (scales with students)
 * 5. Annual Depreciation - Depreciation/Amortization
 * 6. CapEx Buildout - One-time capital expenditure (shown separately)
 *
 * Key Insight: Once you sign the lease and spend the capex, you commit to these
 * fixed costs regardless of enrollment.
 */

import React, { useState, useMemo } from 'react';
import {
  buildSchoolData,
  calculatePortfolioSummary,
  generateInsights,
  getExpenseRules,
  aggregateBySchoolType,
  aggregateByTuitionTier,
  calculateScenario,
  schoolTypeLabels,
  tuitionTierLabels,
  categoryColors,
  presetLabels,
  type SchoolData,
  type PortfolioSummary,
  type SchoolType,
  type TuitionTier,
  type SegmentSummary,
  type ScenarioResult,
  type ExpensePreset,
} from '../data/facilitiesCapexData';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const formatCurrency = (val: number): string => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  color?: 'default' | 'warning' | 'danger' | 'success' | 'blue' | 'violet' | 'teal' | 'red' | 'orange' | 'slate';
}> = ({ title, value, subtitle, color = 'default' }) => {
  const colorClasses: Record<string, string> = {
    default: 'bg-white border-gray-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    violet: 'bg-violet-50 border-violet-200',
    teal: 'bg-teal-50 border-teal-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    slate: 'bg-slate-50 border-slate-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm text-gray-500 font-medium">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
};

const CategoryBar: React.FC<{ summary: PortfolioSummary }> = ({ summary }) => {
  return (
    <div className="space-y-2">
      <div className="flex h-8 rounded-lg overflow-hidden">
        {summary.categoryBreakdown.map((cat) => (
          <div
            key={cat.category}
            style={{
              width: `${cat.pctOfTotal}%`,
              backgroundColor: cat.color,
            }}
            className="flex items-center justify-center"
            title={`${cat.category}: ${formatCurrency(cat.amount)} (${cat.pctOfTotal.toFixed(1)}%)`}
          >
            {cat.pctOfTotal > 8 && (
              <span className="text-white text-xs font-medium truncate px-1">
                {cat.pctOfTotal.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        {summary.categoryBreakdown.map((cat) => (
          <div key={cat.category} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
            <span className="text-gray-600">{cat.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SchoolCostBreakdown: React.FC<{ school: SchoolData }> = ({ school }) => {
  const categories = [
    { name: 'Lease', value: school.costs.lease.total, color: categoryColors.lease },
    { name: 'Fixed Facilities', value: school.costs.fixedFacilities.total, color: categoryColors.fixedFacilities },
    { name: 'Variable Facilities', value: school.costs.variableFacilities.total, color: categoryColors.variableFacilities },
    { name: 'Student Services', value: school.costs.studentServices.total, color: categoryColors.studentServices },
    { name: 'Annual Depreciation', value: school.costs.annualDepreciation.total, color: categoryColors.annualDepreciation },
  ].filter((c) => c.value > 0);

  const total = school.costs.grandTotal;
  if (total === 0) return <div className="text-gray-400 text-sm">No data</div>;

  return (
    <div className="flex h-4 rounded overflow-hidden">
      {categories.map((cat) => (
        <div
          key={cat.name}
          style={{
            width: `${(cat.value / total) * 100}%`,
            backgroundColor: cat.color,
          }}
          title={`${cat.name}: ${formatCurrency(cat.value)} (${((cat.value / total) * 100).toFixed(1)}%)`}
        />
      ))}
    </div>
  );
};

const UtilizationBadge: React.FC<{ rate: number }> = ({ rate }) => {
  const pct = rate * 100;
  let colorClass = 'bg-red-100 text-red-800';
  if (pct >= 75) colorClass = 'bg-green-100 text-green-800';
  else if (pct >= 50) colorClass = 'bg-amber-100 text-amber-800';
  else if (pct >= 25) colorClass = 'bg-orange-100 text-orange-800';

  return (
    <span className={`text-xs px-2 py-1 rounded ${colorClass}`}>
      {pct.toFixed(0)}%
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
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      <button
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          preset === 'dashboard'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onChange('dashboard')}
      >
        {presetLabels.dashboard}
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          preset === 'expense-report'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onChange('expense-report')}
      >
        {presetLabels['expense-report']}
      </button>
    </div>
  );
};

// ============================================================================
// DECISION RECOMMENDATION PANEL (Andy-style)
// ============================================================================

const DecisionPanel: React.FC<{ schools: SchoolData[]; summary: PortfolioSummary }> = ({
  schools,
  summary,
}) => {
  const underutilized = schools.filter((s) => s.utilizationRate < 0.5);
  const cantReach15 = schools.filter((s) => s.breakeven.studentsFor15Pct > s.capacity);

  const opportunities = [...schools]
    .filter((s) => s.utilizationRate < 0.8 && s.currentEnrollment > 0)
    .sort((a, b) => {
      const aGap = a.capacity - a.currentEnrollment;
      const bGap = b.capacity - b.currentEnrollment;
      return bGap - aGap;
    })
    .slice(0, 3);

  const sortedByLease = [...schools].sort((a, b) => b.costs.lease.total - a.costs.lease.total);
  const top3Lease = sortedByLease.slice(0, 3);
  const top3LeasePct =
    summary.totalLease > 0
      ? (top3Lease.reduce((sum, s) => sum + s.costs.lease.total, 0) / summary.totalLease) * 100
      : 0;

  const avgTuition =
    schools.length > 0
      ? schools.reduce((sum, s) => sum + s.tuition, 0) / schools.length
      : 40000;

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg shadow-lg p-6 text-white mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📊</span>
        <h2 className="text-lg font-bold">Decision Summary</h2>
        <span className="text-xs text-gray-400 ml-auto">
          Andy-style: What does the data say?
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="text-xs text-amber-400 uppercase tracking-wide mb-2">The Question</div>
          <div className="text-sm text-gray-300">
            How do we reduce facilities burden from{' '}
            <span className="font-bold text-white">
              {summary.totalEnrollment > 0
                ? ((summary.grandTotal / (summary.totalEnrollment * avgTuition)) * 100).toFixed(0)
                : '∞'}
              %
            </span>{' '}
            of avg tuition to target{' '}
            <span className="font-bold text-green-400">15%</span>?
          </div>
        </div>

        <div>
          <div className="text-xs text-amber-400 uppercase tracking-wide mb-2">Key Finding</div>
          <div className="text-sm text-gray-300">
            <span className="font-bold text-white">{underutilized.length}</span> schools under 50%
            capacity. Filling these first is cheaper than signing new leases.
          </div>
          {underutilized.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              ({underutilized.map((s) => s.displayName.split(' ')[0]).join(', ')})
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-amber-400 uppercase tracking-wide mb-2">
            Lease Concentration
          </div>
          <div className="text-sm text-gray-300">
            Top 3 leases ={' '}
            <span className="font-bold text-white">{top3LeasePct.toFixed(0)}%</span> of total lease
            exposure
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {top3Lease
              .map(
                (s) =>
                  `${s.displayName.split(' ').slice(0, 2).join(' ')}: ${formatCurrency(s.costs.lease.total)}`
              )
              .join(' • ')}
          </div>
        </div>
      </div>

      {/* Top 3 Actions */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-xs text-amber-400 uppercase tracking-wide mb-3">
          Recommended Actions
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {opportunities.map((school, idx) => {
            const studentsNeeded = school.capacity - school.currentEnrollment;
            return (
              <div key={school.id} className="bg-gray-700/50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold">
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-medium">{school.displayName}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Add{' '}
                  <span className="text-green-400 font-medium">{studentsNeeded}</span> students →
                  facilities drops to{' '}
                  <span className="text-green-400 font-medium">
                    {school.breakeven.pctAt100Capacity.toFixed(0)}%
                  </span>{' '}
                  of tuition
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cantReach15.length > 0 && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded">
          <div className="text-xs text-red-400">
            ⚠️{' '}
            <strong>
              {cantReach15.length} schools cannot reach 15% target even at full capacity:
            </strong>{' '}
            {cantReach15.map((s) => s.displayName.split(' ').slice(0, 2).join(' ')).join(', ')}.
            Consider lease renegotiation or closure.
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// NEW SCHOOL ECONOMICS CALCULATOR
// ============================================================================

const NewSchoolCalculator: React.FC = () => {
  const [leaseAmount, setLeaseAmount] = React.useState(150000);
  const [tuition, setTuition] = React.useState(40000);
  const [fixedFacilitiesPct, setFixedFacilitiesPct] = React.useState(25);
  const [capexBuildout, setCapexBuildout] = React.useState(100000);
  const [amortYears, setAmortYears] = React.useState(5);

  const annualDepreciation = capexBuildout / amortYears;
  const totalFixed = leaseAmount * (1 + fixedFacilitiesPct / 100) + annualDepreciation;

  const scenarios = [
    { students: 15, label: '15 students' },
    { students: 25, label: '25 students' },
    { students: 40, label: '40 students' },
    { students: 60, label: '60 students' },
  ].map((s) => ({
    ...s,
    costPerStudent: totalFixed / s.students,
    pctOfTuition: (totalFixed / (s.students * tuition)) * 100,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="font-semibold text-gray-800 mb-4">New School Economics Calculator</h3>
      <p className="text-sm text-gray-500 mb-4">
        Before signing a lease, understand your fixed cost burden at different enrollments.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Annual Lease</label>
          <input
            type="number"
            value={leaseAmount}
            onChange={(e) => setLeaseAmount(Number(e.target.value))}
            className="w-full border rounded px-3 py-2 text-sm"
            step={10000}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tuition</label>
          <input
            type="number"
            value={tuition}
            onChange={(e) => setTuition(Number(e.target.value))}
            className="w-full border rounded px-3 py-2 text-sm"
            step={5000}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Other Fixed (% of lease)</label>
          <input
            type="number"
            value={fixedFacilitiesPct}
            onChange={(e) => setFixedFacilitiesPct(Number(e.target.value))}
            className="w-full border rounded px-3 py-2 text-sm"
            step={5}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">CapEx Buildout</label>
          <input
            type="number"
            value={capexBuildout}
            onChange={(e) => setCapexBuildout(Number(e.target.value))}
            className="w-full border rounded px-3 py-2 text-sm"
            step={25000}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amort. Years</label>
          <input
            type="number"
            value={amortYears}
            onChange={(e) => setAmortYears(Math.max(1, Number(e.target.value)))}
            className="w-full border rounded px-3 py-2 text-sm"
            step={1}
            min={1}
          />
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Total Annual Fixed: <strong>{formatCurrency(totalFixed)}</strong> (Lease +{' '}
        {fixedFacilitiesPct}% other + {formatCurrency(annualDepreciation)}/yr depreciation)
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Enrollment</th>
            <th className="px-3 py-2 text-right">$/Student</th>
            <th className="px-3 py-2 text-right">% of Tuition</th>
            <th className="px-3 py-2 text-left">Verdict</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {scenarios.map((s) => (
            <tr key={s.students}>
              <td className="px-3 py-2">{s.label}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(s.costPerStudent)}</td>
              <td className="px-3 py-2 text-right font-medium">{s.pctOfTuition.toFixed(1)}%</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    s.pctOfTuition <= 15
                      ? 'bg-green-100 text-green-800'
                      : s.pctOfTuition <= 20
                        ? 'bg-blue-100 text-blue-800'
                        : s.pctOfTuition <= 30
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                  }`}
                >
                  {s.pctOfTuition <= 15
                    ? '✓ Target'
                    : s.pctOfTuition <= 20
                      ? 'Acceptable'
                      : s.pctOfTuition <= 30
                        ? 'Warning'
                        : '✗ Too High'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// SEGMENT SUMMARY TABLE
// ============================================================================

const SegmentTable: React.FC<{
  title: string;
  segments: SegmentSummary[];
  onSelectSegment: (schools: SchoolData[]) => void;
}> = ({ title, segments, onSelectSegment }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Segment</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Schools</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                Enrollment
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                Utilization
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                Total Costs
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">$/Student</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">% Tuition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {segments.map((seg) => (
              <tr
                key={seg.segment}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectSegment(seg.schools)}
              >
                <td className="px-3 py-2 font-medium">{seg.segment}</td>
                <td className="px-3 py-2 text-center">{seg.schoolCount}</td>
                <td className="px-3 py-2 text-center">
                  {seg.totalEnrollment} / {seg.totalCapacity}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      seg.utilizationPct >= 70
                        ? 'bg-green-100 text-green-800'
                        : seg.utilizationPct >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {seg.utilizationPct.toFixed(0)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCurrency(seg.totalCosts)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(seg.avgCostPerStudent)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`font-medium ${
                      seg.avgPctOfTuition > 30
                        ? 'text-red-600'
                        : seg.avgPctOfTuition > 20
                          ? 'text-amber-600'
                          : 'text-green-600'
                    }`}
                  >
                    {seg.avgPctOfTuition.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// SCENARIO SLIDER
// ============================================================================

const ScenarioSlider: React.FC<{
  value: number;
  onChange: (val: number) => void;
  scenario: ScenarioResult;
  currentSummary: PortfolioSummary;
}> = ({ value, onChange, scenario, currentSummary }) => {
  const improvementPct =
    currentSummary.avgCostPerStudent > 0
      ? ((currentSummary.avgCostPerStudent - scenario.avgCostPerStudent) /
          currentSummary.avgCostPerStudent) *
        100
      : 0;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">
          Scenario: What if we hit {value}% capacity?
        </h3>
        <div className="text-sm text-gray-500">
          Current: {currentSummary.avgUtilization.toFixed(0)}%
        </div>
      </div>

      <input
        type="range"
        min="50"
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />

      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded p-3">
          <div className="text-xs text-gray-500">Total Enrollment</div>
          <div className="text-lg font-bold">{scenario.totalEnrollment}</div>
          <div className="text-xs text-green-600">
            +{scenario.totalEnrollment - currentSummary.totalEnrollment} students
          </div>
        </div>
        <div className="bg-white rounded p-3">
          <div className="text-xs text-gray-500">$/Student</div>
          <div className="text-lg font-bold">{formatCurrency(scenario.avgCostPerStudent)}</div>
          <div className="text-xs text-green-600">
            ↓ {formatCurrency(scenario.savingsVsCurrent)} saved
          </div>
        </div>
        <div className="bg-white rounded p-3">
          <div className="text-xs text-gray-500">% of Tuition</div>
          <div className="text-lg font-bold">{scenario.avgPctOfTuition.toFixed(1)}%</div>
          <div className="text-xs text-green-600">
            {scenario.avgPctOfTuition <= 15 ? '✓ At target' : `↓ toward 15% target`}
          </div>
        </div>
        <div className="bg-white rounded p-3">
          <div className="text-xs text-gray-500">Efficiency Gain</div>
          <div className="text-lg font-bold text-green-600">+{improvementPct.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">per-student cost reduction</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SQ FT EFFICIENCY TABLE
// ============================================================================

const SqftEfficiencyTable: React.FC<{ schools: SchoolData[] }> = ({ schools }) => {
  const sortedByEfficiency = [...schools].sort(
    (a, b) => a.metrics.costPerSqft - b.metrics.costPerSqft
  );

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">Space Efficiency Analysis ($/sq ft)</h3>
        <p className="text-xs text-gray-500 mt-1">Lower $/sq ft = more efficient use of space</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">School</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Sq Ft</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                Sq Ft / Student
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                Lease/sq ft
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                Total/sq ft
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Efficiency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedByEfficiency.map((school, idx) => {
              const efficiency =
                school.metrics.costPerSqft < 50
                  ? 'Excellent'
                  : school.metrics.costPerSqft < 80
                    ? 'Good'
                    : school.metrics.costPerSqft < 120
                      ? 'Fair'
                      : 'Poor';
              const effColor =
                school.metrics.costPerSqft < 50
                  ? 'bg-green-100 text-green-800'
                  : school.metrics.costPerSqft < 80
                    ? 'bg-blue-100 text-blue-800'
                    : school.metrics.costPerSqft < 120
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800';

              return (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{school.displayName}</div>
                    <div className="text-xs text-gray-500">
                      {schoolTypeLabels[school.schoolType]}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">{school.sqft.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={school.sqftPerStudent > 200 ? 'text-amber-600' : ''}>
                      {school.sqftPerStudent.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    ${school.metrics.leasePerSqft.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    ${school.metrics.costPerSqft.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${effColor}`}>
                      #{idx + 1} {efficiency}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// BREAK-EVEN TABLE
// ============================================================================

const BreakevenTable: React.FC<{ schools: SchoolData[] }> = ({ schools }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">Break-Even Analysis</h3>
        <p className="text-xs text-gray-500 mt-1">
          Students needed to reach target facilities % of tuition
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">School</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Current</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                Need for 20%
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                Need for 15%
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                @ 75% Cap
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                @ 100% Cap
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                Gap to 15%
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schools.map((school) => {
              const gapTo15 = school.breakeven.studentsFor15Pct - school.currentEnrollment;
              const canReach15 = school.breakeven.studentsFor15Pct <= school.capacity;
              const canReach20 = school.breakeven.studentsFor20Pct <= school.capacity;

              return (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{school.displayName}</div>
                    <div className="text-xs text-gray-500">
                      ${school.tuition.toLocaleString()} tuition
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div>
                      {school.currentEnrollment} / {school.capacity}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        school.metrics.pctOfTuitionCurrent > 30
                          ? 'text-red-600'
                          : school.metrics.pctOfTuitionCurrent > 20
                            ? 'text-amber-600'
                            : 'text-green-600'
                      }`}
                    >
                      {school.metrics.pctOfTuitionCurrent.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={canReach20 ? 'text-green-600' : 'text-red-600'}>
                      {school.breakeven.studentsFor20Pct}
                    </span>
                    {!canReach20 && <span className="text-xs text-red-500 ml-1">!</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={canReach15 ? 'text-green-600' : 'text-red-600'}>
                      {school.breakeven.studentsFor15Pct}
                    </span>
                    {!canReach15 && <span className="text-xs text-red-500 ml-1">!</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={
                        school.breakeven.pctAt75Capacity <= 20
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }
                    >
                      {school.breakeven.pctAt75Capacity.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={
                        school.breakeven.pctAt100Capacity <= 15
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }
                    >
                      {school.breakeven.pctAt100Capacity.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {gapTo15 > 0 ? (
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          gapTo15 > school.capacity - school.currentEnrollment
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        +{gapTo15} students
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                        ✓ Achieved
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// CAPEX & BUDGET TAB
// ============================================================================

const CapExBudgetTab: React.FC<{ schools: SchoolData[]; summary: PortfolioSummary }> = ({
  schools,
  summary,
}) => {
  const sortedByDelta = [...schools].sort(
    (a, b) => Math.abs(b.budget.delta) - Math.abs(a.budget.delta)
  );
  const sortedByCapex = [...schools].sort(
    (a, b) => b.costs.capexBuildout - a.costs.capexBuildout
  );

  return (
    <div className="space-y-6">
      {/* CapEx Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total CapEx Buildout"
          value={formatCurrency(summary.totalCapexBuildout)}
          subtitle="One-time capital expenditure"
          color="red"
        />
        <MetricCard
          title="Annual Depreciation"
          value={formatCurrency(summary.totalAnnualDepreciation)}
          subtitle="Amortized annual cost"
          color="slate"
        />
        <MetricCard
          title="Avg CapEx / School"
          value={formatCurrency(summary.totalCapexBuildout / Math.max(summary.totalSchools, 1))}
          subtitle={`${summary.totalSchools} schools`}
        />
        <MetricCard
          title="CapEx / Student (at capacity)"
          value={formatCurrency(summary.totalCapexBuildout / Math.max(summary.totalCapacity, 1))}
          subtitle="One-time cost per seat"
        />
      </div>

      {/* Budget vs Actual */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">Budget vs Actual (Cost per Student)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Model cost per student vs actual cost per student at capacity. Delta shows
            over/under budget.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">School</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  Model $/Student
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  Actual $/Student
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Delta</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  Delta %
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedByDelta.map((school) => {
                const isOver = school.budget.delta > 0;
                return (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{school.displayName}</div>
                      <div className="text-xs text-gray-500">
                        {schoolTypeLabels[school.schoolType]}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(school.budget.modelCostPerStudent)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(school.budget.actualCostPerStudent)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${isOver ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {isOver ? '+' : ''}
                      {formatCurrency(school.budget.delta)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${isOver ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {isOver ? '+' : ''}
                      {school.budget.deltaPct.toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          Math.abs(school.budget.deltaPct) <= 10
                            ? 'bg-green-100 text-green-800'
                            : Math.abs(school.budget.deltaPct) <= 25
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {Math.abs(school.budget.deltaPct) <= 10
                          ? 'On Track'
                          : Math.abs(school.budget.deltaPct) <= 25
                            ? 'Watch'
                            : isOver
                              ? 'Over Budget'
                              : 'Under Budget'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CapEx Buildout Schedule */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800">CapEx Buildout by School</h3>
          <p className="text-xs text-gray-500 mt-1">
            One-time capital expenditure and annual depreciation impact
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">School</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  CapEx Buildout
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  Annual Depr.
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  Depr. / Student
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                  Capacity
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                  CapEx / Seat
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  Buildout Bar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedByCapex.map((school) => {
                const maxCapex = sortedByCapex[0]?.costs.capexBuildout || 1;
                const barWidth = (school.costs.capexBuildout / maxCapex) * 100;
                const capexPerSeat = school.costs.capexBuildout / Math.max(school.capacity, 1);
                const deprPerStudent =
                  school.costs.annualDepreciation.total / Math.max(school.capacity, 1);

                return (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{school.displayName}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-red-700">
                      {formatCurrency(school.costs.capexBuildout)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {formatCurrency(school.costs.annualDepreciation.total)}
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(deprPerStudent)}</td>
                    <td className="px-3 py-2 text-center">{school.capacity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(capexPerSeat)}</td>
                    <td className="px-3 py-2 w-32">
                      <div className="h-3 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New School Calculator */}
      <NewSchoolCalculator />
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

const FacilitiesCapexDashboard: React.FC = () => {
  const [sortColumn, setSortColumn] = useState<keyof SchoolData | 'grandTotal'>('grandTotal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Filters
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<SchoolType | 'all'>('all');
  const [tuitionTierFilter, setTuitionTierFilter] = useState<TuitionTier | 'all'>('all');

  // Expense preset
  const [expensePreset, setExpensePreset] = useState<ExpensePreset>('dashboard');

  // Scenario
  const [scenarioUtilization, setScenarioUtilization] = useState(75);

  // View mode
  const [activeTab, setActiveTab] = useState<
    'overview' | 'segmentation' | 'breakeven' | 'capex-budget'
  >('overview');

  const allSchools = useMemo(() => buildSchoolData(), []);

  // Apply filters
  const schools = useMemo(() => {
    return allSchools.filter((s) => {
      if (schoolTypeFilter !== 'all' && s.schoolType !== schoolTypeFilter) return false;
      if (tuitionTierFilter !== 'all' && s.tuitionTier !== tuitionTierFilter) return false;
      return true;
    });
  }, [allSchools, schoolTypeFilter, tuitionTierFilter]);

  const summary = useMemo(() => calculatePortfolioSummary(schools), [schools]);
  const insights = useMemo(() => generateInsights(summary), [summary]);
  const currentExpenseRules = useMemo(() => getExpenseRules(expensePreset), [expensePreset]);

  // Segmentation
  const bySchoolType = useMemo(() => aggregateBySchoolType(allSchools), [allSchools]);
  const byTuitionTier = useMemo(() => aggregateByTuitionTier(allSchools), [allSchools]);

  // Scenario (passes preset through)
  const scenario = useMemo(
    () => calculateScenario(schools, scenarioUtilization, expensePreset),
    [schools, scenarioUtilization, expensePreset]
  );

  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortColumn === 'grandTotal') {
        aVal = a.costs.grandTotal;
        bVal = b.costs.grandTotal;
      } else if (sortColumn === 'displayName') {
        return sortDirection === 'asc'
          ? a.displayName.localeCompare(b.displayName)
          : b.displayName.localeCompare(a.displayName);
      } else {
        aVal = (a as any)[sortColumn] ?? 0;
        bVal = (b as any)[sortColumn] ?? 0;
      }

      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [schools, sortColumn, sortDirection]);

  const handleSort = (column: keyof SchoolData | 'grandTotal') => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Calculate fixed vs variable totals
  const fixedTotal =
    summary.totalLease + summary.totalFixedFacilities + summary.totalAnnualDepreciation;
  const fixedPct = summary.grandTotal > 0 ? (fixedTotal / summary.grandTotal) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Facilities & Capex Cost Analysis
            </h1>
            <p className="text-gray-500 mt-1">
              Fixed real estate costs that cannot scale with enrollment
            </p>
            <div className="text-xs text-gray-400 mt-2">
              Data Source: Facilities & Capex Costs spreadsheet • {summary.totalSchools} schools •
              Year-end actuals
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Expense Preset Toggle */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expense Rules</label>
              <PresetToggle preset={expensePreset} onChange={setExpensePreset} />
            </div>

            {/* Filters */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">School Type</label>
              <select
                value={schoolTypeFilter}
                onChange={(e) => setSchoolTypeFilter(e.target.value as SchoolType | 'all')}
                className="border rounded px-3 py-1.5 text-sm"
              >
                <option value="all">All Types</option>
                {Object.entries(schoolTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tuition Tier</label>
              <select
                value={tuitionTierFilter}
                onChange={(e) => setTuitionTierFilter(e.target.value as TuitionTier | 'all')}
                className="border rounded px-3 py-1.5 text-sm"
              >
                <option value="all">All Tiers</option>
                {Object.entries(tuitionTierLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mt-4 border-b">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'segmentation', label: 'Segmentation' },
              { id: 'breakeven', label: 'Break-Even' },
              { id: 'capex-budget', label: 'CapEx & Budget' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2 text-sm font-medium rounded-t ${
                activeTab === tab.id
                  ? 'bg-white border border-b-white text-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SEGMENTATION TAB */}
      {activeTab === 'segmentation' && (
        <div className="space-y-6">
          <ScenarioSlider
            value={scenarioUtilization}
            onChange={setScenarioUtilization}
            scenario={scenario}
            currentSummary={summary}
          />

          <SegmentTable
            title="By School Type"
            segments={bySchoolType}
            onSelectSegment={(filteredSchools) => {
              if (filteredSchools.length > 0) {
                setSchoolTypeFilter(filteredSchools[0].schoolType);
                setActiveTab('overview');
              }
            }}
          />

          <SegmentTable
            title="By Tuition Tier"
            segments={byTuitionTier}
            onSelectSegment={(filteredSchools) => {
              if (filteredSchools.length > 0) {
                setTuitionTierFilter(filteredSchools[0].tuitionTier);
                setActiveTab('overview');
              }
            }}
          />

          <SqftEfficiencyTable schools={schools} />
        </div>
      )}

      {/* BREAK-EVEN TAB */}
      {activeTab === 'breakeven' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-medium text-blue-800">Understanding Break-Even</div>
            <div className="text-sm text-blue-700 mt-1">
              This table shows how many students each school needs to reach target
              facilities-to-tuition ratios.
              <strong className="ml-1">15% is the ideal target</strong> - above 20% is a warning
              sign. Red numbers indicate the target is impossible at current capacity.
            </div>
          </div>

          <BreakevenTable schools={schools} />
          <NewSchoolCalculator />
        </div>
      )}

      {/* CAPEX & BUDGET TAB */}
      {activeTab === 'capex-budget' && <CapExBudgetTab schools={schools} summary={summary} />}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Decision Panel */}
          <DecisionPanel schools={schools} summary={summary} />

          {/* Fixed Cost Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="text-amber-500 text-xl mr-3">⚠</div>
              <div>
                <div className="font-medium text-amber-800">Fixed Cost Commitment</div>
                <div className="text-sm text-amber-700 mt-1">
                  <strong>{fixedPct.toFixed(0)}%</strong> of facilities costs (
                  {formatCurrency(fixedTotal)}) are fixed and cannot scale with enrollment. Once you
                  sign the lease and spend the capex, these costs are locked in.
                </div>
              </div>
            </div>
          </div>

          {/* 6-Category Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <MetricCard
              title="1. Lease"
              value={formatCurrency(summary.totalLease)}
              subtitle="Rent (Day 1)"
              color="blue"
            />
            <MetricCard
              title="2. Fixed Facilities"
              value={formatCurrency(summary.totalFixedFacilities)}
              subtitle="Security, IT, Landscaping"
              color="violet"
            />
            <MetricCard
              title="3. Variable Facilities"
              value={formatCurrency(summary.totalVariableFacilities)}
              subtitle="Janitorial, Utilities, Repairs"
              color="teal"
            />
            <MetricCard
              title="4. Student Services"
              value={formatCurrency(summary.totalStudentServices)}
              subtitle="Food, Transportation"
              color="orange"
            />
            <MetricCard
              title="5. Annual Depreciation"
              value={formatCurrency(summary.totalAnnualDepreciation)}
              subtitle="Amortized CapEx"
              color="slate"
            />
            <MetricCard
              title="6. CapEx Buildout"
              value={formatCurrency(summary.totalCapexBuildout)}
              subtitle="One-time (not in annual)"
              color="red"
            />
          </div>

          {/* Category Breakdown Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">Portfolio Cost Breakdown</h2>
              <div className="text-sm text-gray-500">
                Annual: {formatCurrency(summary.grandTotal)} | Excl. Lease:{' '}
                {formatCurrency(summary.totalExcludingLease)}
              </div>
            </div>
            <CategoryBar summary={summary} />
          </div>

          {/* Category Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {summary.categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  setExpandedCategory(expandedCategory === cat.category ? null : cat.category)
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-gray-800 text-sm">{cat.category}</span>
                </div>
                <div className="text-xl font-bold">{formatCurrency(cat.amount)}</div>
                <div className="text-xs text-gray-500">{cat.pctOfTotal.toFixed(1)}% of total</div>

                {cat.subcategories && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    {cat.subcategories
                      .filter((sub) => sub.amount > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .map((sub) => (
                        <div key={sub.name} className="flex justify-between text-xs">
                          <span className="text-gray-600">{sub.name}</span>
                          <span className="font-medium">{formatCurrency(sub.amount)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Portfolio KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Annual Cost"
              value={formatCurrency(summary.grandTotal)}
              subtitle={`${summary.totalSchools} schools analyzed`}
            />
            <MetricCard
              title="Total Excl. Lease"
              value={formatCurrency(summary.totalExcludingLease)}
              subtitle="What you spend AFTER signing"
              color="warning"
            />
            <MetricCard
              title="Avg Cost per Student"
              value={formatCurrency(summary.avgCostPerStudent)}
              subtitle="At current enrollment"
            />
            <MetricCard
              title="Portfolio Utilization"
              value={`${summary.avgUtilization.toFixed(0)}%`}
              subtitle={`${summary.totalEnrollment} / ${summary.totalCapacity} students`}
              color={summary.avgUtilization < 50 ? 'danger' : 'default'}
            />
          </div>

          {/* School Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">School-by-School Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('displayName')}
                    >
                      School
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Enrollment
                    </th>
                    <th
                      className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('grandTotal')}
                    >
                      Total
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Lease
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Fixed
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Variable
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Svc
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Depr.
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      % Tuit.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Breakdown
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedSchools.map((school) => (
                    <tr
                      key={school.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedSchool(school)}
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900 text-sm">
                          {school.displayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {schoolTypeLabels[school.schoolType]} •{' '}
                          ${school.tuition.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="text-sm">
                          {school.currentEnrollment} / {school.capacity}
                        </div>
                        <UtilizationBadge rate={school.utilizationRate} />
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-sm">
                        {formatCurrency(school.costs.grandTotal)}
                      </td>
                      <td className="px-3 py-3 text-right text-blue-700 text-sm">
                        {formatCurrency(school.costs.lease.total)}
                      </td>
                      <td className="px-3 py-3 text-right text-violet-700 text-sm">
                        {formatCurrency(school.costs.fixedFacilities.total)}
                      </td>
                      <td className="px-3 py-3 text-right text-teal-700 text-sm">
                        {formatCurrency(school.costs.variableFacilities.total)}
                      </td>
                      <td className="px-3 py-3 text-right text-orange-700 text-sm">
                        {formatCurrency(school.costs.studentServices.total)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-700 text-sm">
                        {formatCurrency(school.costs.annualDepreciation.total)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`font-medium text-sm ${
                            school.metrics.pctOfTuitionCurrent > 30
                              ? 'text-red-600'
                              : school.metrics.pctOfTuitionCurrent > 20
                                ? 'text-amber-600'
                                : 'text-gray-900'
                          }`}
                        >
                          {school.metrics.pctOfTuitionCurrent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 w-32">
                        <SchoolCostBreakdown school={school} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Behavior Rules */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Expense Behavior by Category</h2>
              <div className="text-sm text-gray-500">
                Preset: <strong>{presetLabels[expensePreset]}</strong>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {currentExpenseRules.map((rule) => {
                const ruleCategoryColors: Record<string, string> = {
                  lease: 'border-blue-200 bg-blue-50',
                  'fixed-facilities': 'border-violet-200 bg-violet-50',
                  'variable-facilities': 'border-teal-200 bg-teal-50',
                  'student-services': 'border-orange-200 bg-orange-50',
                  'annual-depreciation': 'border-slate-200 bg-slate-50',
                };
                return (
                  <div
                    key={rule.id}
                    className={`border rounded p-3 ${ruleCategoryColors[rule.category] || 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900 text-sm">{rule.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          rule.costType === 'fixed'
                            ? 'bg-red-100 text-red-800'
                            : rule.costType === 'variable'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rule.costType}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 mb-2">
                      <span>Fixed: {(rule.fixedPercent * 100).toFixed(0)}%</span>
                      <span>Var: {(rule.variablePercent * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs text-gray-600">{rule.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-lg p-4 ${
                  insight.category === 'fixed-cost-warning'
                    ? 'bg-amber-50 border border-amber-200'
                    : insight.category === 'opportunity'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`text-lg ${
                      insight.category === 'fixed-cost-warning'
                        ? 'text-amber-500'
                        : insight.category === 'opportunity'
                          ? 'text-green-500'
                          : 'text-blue-500'
                    }`}
                  >
                    {insight.category === 'fixed-cost-warning'
                      ? '⚠'
                      : insight.category === 'opportunity'
                        ? '↑'
                        : 'ℹ'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{insight.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{insight.description}</div>
                    {insight.metric !== undefined && (
                      <div className="text-sm font-semibold mt-2">
                        {typeof insight.metric === 'number' && insight.metric >= 1000
                          ? formatCurrency(insight.metric)
                          : insight.metric}
                        {insight.unit && ` ${insight.unit}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* School Detail Drawer */}
      {selectedSchool && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">{selectedSchool.displayName}</h2>
                <div className="text-sm text-gray-500">
                  {selectedSchool.currentEnrollment} / {selectedSchool.capacity} students (
                  {(selectedSchool.utilizationRate * 100).toFixed(0)}% utilization)
                </div>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Total Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-500">Total Annual</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(selectedSchool.costs.grandTotal)}
                  </div>
                </div>
                <div className="bg-amber-50 rounded p-3">
                  <div className="text-xs text-gray-500">Excl. Lease</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(selectedSchool.costs.totalExcludingLease)}
                  </div>
                </div>
              </div>

              {/* 6-Category Breakdown */}
              <div>
                <h3 className="font-medium mb-3">6-Category Breakdown</h3>
                <div className="space-y-3">
                  {/* Lease */}
                  <div className="border-l-4 border-blue-600 pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-800">1. Lease</span>
                      <span className="font-bold">
                        {formatCurrency(selectedSchool.costs.lease.total)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Rent: {formatCurrency(selectedSchool.costs.lease.rent)}
                    </div>
                  </div>

                  {/* Fixed Facilities */}
                  <div className="border-l-4 border-violet-600 pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-violet-800">2. Fixed Facilities</span>
                      <span className="font-bold">
                        {formatCurrency(selectedSchool.costs.fixedFacilities.total)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {selectedSchool.costs.fixedFacilities.security > 0 && (
                        <div>
                          Security:{' '}
                          {formatCurrency(selectedSchool.costs.fixedFacilities.security)}
                        </div>
                      )}
                      {selectedSchool.costs.fixedFacilities.itMaintenance > 0 && (
                        <div>
                          IT Maintenance:{' '}
                          {formatCurrency(selectedSchool.costs.fixedFacilities.itMaintenance)}
                        </div>
                      )}
                      {selectedSchool.costs.fixedFacilities.landscaping > 0 && (
                        <div>
                          Landscaping:{' '}
                          {formatCurrency(selectedSchool.costs.fixedFacilities.landscaping)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variable Facilities */}
                  <div className="border-l-4 border-teal-600 pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-teal-800">3. Variable Facilities</span>
                      <span className="font-bold">
                        {formatCurrency(selectedSchool.costs.variableFacilities.total)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {selectedSchool.costs.variableFacilities.repairs > 0 && (
                        <div>
                          Repairs:{' '}
                          {formatCurrency(selectedSchool.costs.variableFacilities.repairs)}
                        </div>
                      )}
                      {selectedSchool.costs.variableFacilities.utilities > 0 && (
                        <div>
                          Utilities:{' '}
                          {formatCurrency(selectedSchool.costs.variableFacilities.utilities)}
                        </div>
                      )}
                      {selectedSchool.costs.variableFacilities.janitorial > 0 && (
                        <div>
                          Janitorial:{' '}
                          {formatCurrency(selectedSchool.costs.variableFacilities.janitorial)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student Services */}
                  <div className="border-l-4 border-orange-600 pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-orange-800">4. Student Services</span>
                      <span className="font-bold">
                        {formatCurrency(selectedSchool.costs.studentServices.total)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      {selectedSchool.costs.studentServices.foodServices > 0 && (
                        <div>
                          Food Services:{' '}
                          {formatCurrency(selectedSchool.costs.studentServices.foodServices)}
                        </div>
                      )}
                      {selectedSchool.costs.studentServices.transportation > 0 && (
                        <div>
                          Transportation:{' '}
                          {formatCurrency(selectedSchool.costs.studentServices.transportation)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Annual Depreciation */}
                  <div className="border-l-4 border-slate-600 pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-800">5. Annual Depreciation</span>
                      <span className="font-bold">
                        {formatCurrency(selectedSchool.costs.annualDepreciation.total)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Amortized CapEx:{' '}
                      {formatCurrency(selectedSchool.costs.annualDepreciation.depreciation)}
                    </div>
                  </div>

                  {/* CapEx Buildout */}
                  <div className="border-l-4 border-red-600 pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-red-800">6. CapEx Buildout</span>
                      <span className="font-bold">
                        {formatCurrency(selectedSchool.costs.capexBuildout)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      One-time cost (not in annual total)
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Comparison */}
              <div>
                <h3 className="font-medium mb-3">Budget vs Actual</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model $/Student:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedSchool.budget.modelCostPerStudent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual $/Student:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedSchool.budget.actualCostPerStudent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delta:</span>
                    <span
                      className={`font-medium ${selectedSchool.budget.delta > 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {selectedSchool.budget.delta > 0 ? '+' : ''}
                      {formatCurrency(selectedSchool.budget.delta)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Per-Student Metrics */}
              <div>
                <h3 className="font-medium mb-3">Per-Student Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">$/Student (Current):</span>
                    <span className="font-medium">
                      {formatCurrency(selectedSchool.metrics.costPerStudentCurrent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">$/Student (At Capacity):</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(selectedSchool.metrics.costPerStudentCapacity)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">% of Tuition (Current):</span>
                    <span className="font-medium">
                      {selectedSchool.metrics.pctOfTuitionCurrent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">% of Tuition (At Capacity):</span>
                    <span className="font-medium text-green-600">
                      {selectedSchool.metrics.pctOfTuitionCapacity.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Space Analysis */}
              <div>
                <h3 className="font-medium mb-3">Space Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sq Ft:</span>
                    <span className="font-medium">
                      {selectedSchool.sqft.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sq Ft / Student:</span>
                    <span className="font-medium">
                      {selectedSchool.sqftPerStudent.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lease / Sq Ft:</span>
                    <span className="font-medium">
                      ${selectedSchool.metrics.leasePerSqft.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total / Sq Ft:</span>
                    <span className="font-medium">
                      ${selectedSchool.metrics.costPerSqft.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Capacity Opportunity */}
              <div className="bg-green-50 rounded p-4">
                <div className="text-sm font-medium text-green-800">Capacity Improvement</div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {selectedSchool.metrics.pctOfTuitionCurrent > 0
                    ? (
                        (1 -
                          selectedSchool.metrics.pctOfTuitionCapacity /
                            selectedSchool.metrics.pctOfTuitionCurrent) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </div>
                <div className="text-xs text-green-700 mt-1">
                  potential reduction in facilities % of tuition at full capacity
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
