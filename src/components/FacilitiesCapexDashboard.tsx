/**
 * Facilities & Capex Cost Analysis Dashboard
 *
 * Analyzes real estate and facilities as fixed costs that cannot scale with enrollment.
 * Shows what percentage of each school's tuition at capacity is consumed by facilities.
 *
 * Klair MCP Integration:
 * - edu_financials: QuickBooks P&L for facilities costs
 * - edu_expense_analysis: Detailed expense transactions
 * - edu_operational_excellence: Student enrollment
 * - edu_ops_dashboard: Wrike facilities status
 */

import React, { useState, useMemo } from 'react';
import {
  expenseRules,
  klairFacilitiesCosts,
  klairEnrollment,
  schoolCapacity,
  analysisViews,
  keyInsights,
  calculateFixedCosts,
  calculateSchoolMetrics,
  type School,
  type AnalysisView,
  type SchoolFacilitiesCosts
} from '../data/facilitiesCapexData';

// ============================================================================
// TYPES
// ============================================================================

interface SchoolRow {
  id: string;
  name: string;
  currentEnrollment: number;
  capacity: number;
  utilizationRate: number;
  tuition: number;
  facilitiesCostsTotal: number;
  fixedCostsTotal: number;
  costPerStudentCurrent: number;
  costPerStudentCapacity: number;
  pctOfTuitionCurrent: number;
  pctOfTuitionCapacity: number;
  fixedPctOfTotal: number;
  costs: SchoolFacilitiesCosts;
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function buildSchoolData(): SchoolRow[] {
  const schools: SchoolRow[] = [];

  for (const [id, costs] of Object.entries(klairFacilitiesCosts)) {
    const enrollment = klairEnrollment[id] || 1;
    const capacityData = schoolCapacity[id] || { capacity: 25, tuition: 40000 };

    const facilitiesCostsTotal = Object.values(costs).reduce((sum, val) => sum + val, 0);
    const fixedCostsTotal = calculateFixedCosts(costs);
    const utilizationRate = enrollment / capacityData.capacity;

    const tuitionRevenueCurrent = enrollment * capacityData.tuition;
    const tuitionRevenueCapacity = capacityData.capacity * capacityData.tuition;

    schools.push({
      id,
      name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      currentEnrollment: enrollment,
      capacity: capacityData.capacity,
      utilizationRate,
      tuition: capacityData.tuition,
      facilitiesCostsTotal,
      fixedCostsTotal,
      costPerStudentCurrent: facilitiesCostsTotal / Math.max(enrollment, 1),
      costPerStudentCapacity: facilitiesCostsTotal / Math.max(capacityData.capacity, 1),
      pctOfTuitionCurrent: (facilitiesCostsTotal / tuitionRevenueCurrent) * 100,
      pctOfTuitionCapacity: (facilitiesCostsTotal / tuitionRevenueCapacity) * 100,
      fixedPctOfTotal: facilitiesCostsTotal > 0 ? (fixedCostsTotal / facilitiesCostsTotal) * 100 : 0,
      costs
    });
  }

  return schools.sort((a, b) => b.facilitiesCostsTotal - a.facilitiesCostsTotal);
}

// ============================================================================
// COMPONENTS
// ============================================================================

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'warning' | 'danger' | 'success';
}> = ({ title, value, subtitle, trend, color = 'default' }) => {
  const colorClasses = {
    default: 'bg-white border-gray-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm text-gray-500 font-medium">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
};

const CostBreakdownBar: React.FC<{ costs: SchoolFacilitiesCosts; total: number }> = ({ costs, total }) => {
  if (total === 0) return <div className="text-gray-400 text-sm">No data</div>;

  const categories = [
    { name: 'Rent', value: costs.rent, color: '#1e40af' },
    { name: 'Maintenance', value: costs.maintenance, color: '#0d9488' },
    { name: 'Security', value: costs.security, color: '#7c3aed' },
    { name: 'IT', value: costs.itMaintenance, color: '#4f46e5' },
    { name: 'Utilities', value: costs.utilities, color: '#d97706' },
    { name: 'Transport', value: costs.transportation, color: '#16a34a' },
    { name: 'Other', value: costs.facilitiesLabor + costs.landscaping + costs.janitorial + costs.food + costs.other, color: '#6b7280' }
  ].filter(c => c.value > 0);

  return (
    <div className="flex h-4 rounded overflow-hidden">
      {categories.map((cat, i) => (
        <div
          key={cat.name}
          style={{
            width: `${(cat.value / total) * 100}%`,
            backgroundColor: cat.color
          }}
          title={`${cat.name}: $${cat.value.toLocaleString()} (${((cat.value / total) * 100).toFixed(1)}%)`}
        />
      ))}
    </div>
  );
};

const UtilizationBadge: React.FC<{ rate: number }> = ({ rate }) => {
  const pct = rate * 100;
  let color = 'bg-red-100 text-red-800';
  if (pct >= 75) color = 'bg-green-100 text-green-800';
  else if (pct >= 50) color = 'bg-amber-100 text-amber-800';
  else if (pct >= 25) color = 'bg-orange-100 text-orange-800';

  return (
    <span className={`text-xs px-2 py-1 rounded ${color}`}>
      {pct.toFixed(0)}%
    </span>
  );
};

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

const FacilitiesCapexDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<AnalysisView>('per-student-current');
  const [sortColumn, setSortColumn] = useState<keyof SchoolRow>('facilitiesCostsTotal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedSchool, setSelectedSchool] = useState<SchoolRow | null>(null);

  const schools = useMemo(() => buildSchoolData(), []);

  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier;
      }
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });
  }, [schools, sortColumn, sortDirection]);

  // Portfolio totals
  const portfolioTotals = useMemo(() => {
    const totalFacilities = schools.reduce((sum, s) => sum + s.facilitiesCostsTotal, 0);
    const totalFixed = schools.reduce((sum, s) => sum + s.fixedCostsTotal, 0);
    const totalEnrollment = schools.reduce((sum, s) => sum + s.currentEnrollment, 0);
    const totalCapacity = schools.reduce((sum, s) => sum + s.capacity, 0);

    return {
      totalFacilities,
      totalFixed,
      fixedPct: totalFacilities > 0 ? (totalFixed / totalFacilities) * 100 : 0,
      avgUtilization: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,
      avgCostPerStudent: totalEnrollment > 0 ? totalFacilities / totalEnrollment : 0,
      schoolCount: schools.length
    };
  }, [schools]);

  const handleSort = (column: keyof SchoolRow) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Facilities & Capex Cost Analysis</h1>
        <p className="text-gray-500 mt-1">
          Analyzing fixed real estate costs that cannot scale with enrollment
        </p>
        <div className="text-xs text-gray-400 mt-2">
          Data Source: Klair MCP - edu_financials, edu_operational_excellence
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="text-amber-500 text-xl mr-3">!</div>
          <div>
            <div className="font-medium text-amber-800">Fixed Cost Warning</div>
            <div className="text-sm text-amber-700 mt-1">
              <strong>{portfolioTotals.fixedPct.toFixed(0)}%</strong> of facilities costs
              ({formatCurrency(portfolioTotals.totalFixed)}) are fixed and cannot be reduced
              without relocating or renegotiating leases.
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Facilities Costs"
          value={formatCurrency(portfolioTotals.totalFacilities)}
          subtitle="Annual operating facilities"
        />
        <MetricCard
          title="Fixed Cost Portion"
          value={formatCurrency(portfolioTotals.totalFixed)}
          subtitle={`${portfolioTotals.fixedPct.toFixed(0)}% of total`}
          color="warning"
        />
        <MetricCard
          title="Avg Cost per Student"
          value={formatCurrency(portfolioTotals.avgCostPerStudent)}
          subtitle="At current enrollment"
        />
        <MetricCard
          title="Portfolio Utilization"
          value={`${portfolioTotals.avgUtilization.toFixed(0)}%`}
          subtitle={`${portfolioTotals.schoolCount} schools analyzed`}
          color={portfolioTotals.avgUtilization < 50 ? 'danger' : 'default'}
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        {analysisViews.slice(0, 4).map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`px-3 py-1.5 text-sm rounded ${
              activeView === view.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {view.name}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                School
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Enrollment
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('facilitiesCostsTotal')}
              >
                Facilities Cost
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('costPerStudentCurrent')}
              >
                $/Student (Current)
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('costPerStudentCapacity')}
              >
                $/Student (Capacity)
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('pctOfTuitionCurrent')}
              >
                % of Tuition
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cost Breakdown
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedSchools.map(school => (
              <tr
                key={school.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedSchool(school)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{school.name}</div>
                  <div className="text-xs text-gray-500">
                    ${school.tuition.toLocaleString()} tuition
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-sm">
                    {school.currentEnrollment} / {school.capacity}
                  </div>
                  <UtilizationBadge rate={school.utilizationRate} />
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(school.facilitiesCostsTotal)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(school.costPerStudentCurrent)}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {formatCurrency(school.costPerStudentCapacity)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${
                    school.pctOfTuitionCurrent > 30 ? 'text-red-600' :
                    school.pctOfTuitionCurrent > 20 ? 'text-amber-600' :
                    'text-gray-900'
                  }`}>
                    {school.pctOfTuitionCurrent.toFixed(1)}%
                  </span>
                  <span className="text-gray-400 text-xs ml-1">
                    ({school.pctOfTuitionCapacity.toFixed(1)}% @ cap)
                  </span>
                </td>
                <td className="px-4 py-3 w-48">
                  <CostBreakdownBar costs={school.costs} total={school.facilitiesCostsTotal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expense Rules Reference */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Expense Behavior Rules</h2>
        <p className="text-sm text-gray-500 mb-4">
          How each cost category scales with enrollment (from Facilities & Capex analysis)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenseRules.slice(0, 6).map(rule => (
            <div key={rule.id} className="border rounded p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-900">{rule.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  rule.costType === 'fixed' ? 'bg-red-100 text-red-800' :
                  rule.costType === 'variable' ? 'bg-green-100 text-green-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {rule.costType}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Fixed: {(rule.fixedPercent * 100).toFixed(0)}%</span>
                <span>Variable: {(rule.variablePercent * 100).toFixed(0)}%</span>
              </div>
              {rule.notes && (
                <div className="text-xs text-gray-400 mt-2 italic">{rule.notes}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {keyInsights.map(insight => (
          <div
            key={insight.id}
            className={`rounded-lg p-4 ${
              insight.category === 'risk' ? 'bg-red-50 border border-red-200' :
              insight.category === 'opportunity' ? 'bg-green-50 border border-green-200' :
              'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`text-lg ${
                insight.category === 'risk' ? 'text-red-500' :
                insight.category === 'opportunity' ? 'text-green-500' :
                'text-blue-500'
              }`}>
                {insight.category === 'risk' ? '!' :
                 insight.category === 'opportunity' ? '+' : 'i'}
              </div>
              <div>
                <div className="font-medium text-gray-900">{insight.title}</div>
                <div className="text-sm text-gray-600 mt-1">{insight.description}</div>
                {insight.metric && (
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

      {/* Detail Drawer - shown when school is selected */}
      {selectedSchool && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">{selectedSchool.name}</h2>
                <div className="text-sm text-gray-500">
                  {selectedSchool.currentEnrollment} / {selectedSchool.capacity} students
                </div>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                X
              </button>
            </div>

            <div className="space-y-6">
              {/* Summary metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-500">Total Facilities</div>
                  <div className="text-lg font-bold">{formatCurrency(selectedSchool.facilitiesCostsTotal)}</div>
                </div>
                <div className="bg-amber-50 rounded p-3">
                  <div className="text-xs text-gray-500">Fixed Portion</div>
                  <div className="text-lg font-bold">{formatCurrency(selectedSchool.fixedCostsTotal)}</div>
                  <div className="text-xs text-gray-400">{selectedSchool.fixedPctOfTotal.toFixed(0)}% fixed</div>
                </div>
              </div>

              {/* Cost breakdown */}
              <div>
                <h3 className="font-medium mb-3">Cost Breakdown</h3>
                {Object.entries(selectedSchool.costs)
                  .filter(([_, val]) => val > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm font-medium">{formatCurrency(val)}</span>
                    </div>
                  ))
                }
              </div>

              {/* Scenario comparison */}
              <div>
                <h3 className="font-medium mb-3">Current vs At Capacity</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>$/Student Current:</span>
                    <span className="font-medium">{formatCurrency(selectedSchool.costPerStudentCurrent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>$/Student @ Capacity:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedSchool.costPerStudentCapacity)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>% Tuition Current:</span>
                    <span className="font-medium">{selectedSchool.pctOfTuitionCurrent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>% Tuition @ Capacity:</span>
                    <span className="font-medium text-green-600">{selectedSchool.pctOfTuitionCapacity.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Improvement potential */}
              <div className="bg-green-50 rounded p-4">
                <div className="text-sm font-medium text-green-800">Capacity Improvement Potential</div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {((1 - selectedSchool.pctOfTuitionCapacity / selectedSchool.pctOfTuitionCurrent) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-green-700 mt-1">
                  reduction in facilities % of tuition at full capacity
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
