/**
 * Facilities & Capex Cost Analysis Data
 *
 * 4-CATEGORY STRUCTURE:
 * 1. LEASE - Rent commitment (fixed, locked-in day 1)
 * 2. FIXED FACILITIES COST - Security, IT maintenance, landscaping (doesn't scale with students)
 * 3. VARIABLE FACILITIES COST - Janitorial, utilities, repairs (scales with students)
 * 4. DEPRECIATED CAPEX - Depreciation/Amortization on renovations/furnishings
 *
 * Key Insight: Real estate represents fixed costs that cannot scale with enrollment.
 * Once you sign the lease and spend the capex, you commit to these costs regardless of students.
 *
 * Data Sources (Klair MCP):
 * - staging_education.quickbooks_pl_data (actual costs by company_id)
 * - core_education.google_sheets_school_financial_models_summary (capacity/budget)
 */

// ============================================================================
// 4-CATEGORY COST STRUCTURE
// ============================================================================

export interface LeaseCategory {
  rent: number;
  total: number;
}

export interface FixedFacilitiesCategory {
  security: number;
  itMaintenance: number;
  landscaping: number;
  total: number;
}

export interface VariableFacilitiesCategory {
  janitorial: number;
  utilities: number;
  repairs: number;
  total: number;
}

export interface DepreciatedCapexCategory {
  depreciation: number;
  total: number;
}

export interface FourCategoryCosts {
  lease: LeaseCategory;
  fixedFacilities: FixedFacilitiesCategory;
  variableFacilities: VariableFacilitiesCategory;
  depreciatedCapex: DepreciatedCapexCategory;
  grandTotal: number;
  totalExcludingLease: number; // Key metric: what's spent AFTER signing lease
}

// ============================================================================
// SCHOOL DATA FROM KLAIR
// ============================================================================

export interface SchoolData {
  id: string;
  name: string;
  displayName: string;
  companyId: string; // Klair company_id

  // Classification
  schoolType: SchoolType;
  tuitionTier: TuitionTier;

  // Enrollment & Capacity
  currentEnrollment: number;
  capacity: number;
  utilizationRate: number;
  tuition: number;

  // Square Footage
  sqft: number;
  sqftPerStudent: number; // at current enrollment

  // 4-Category Costs
  costs: FourCategoryCosts;

  // Calculated Metrics
  metrics: {
    costPerStudentCurrent: number;
    costPerStudentCapacity: number;
    pctOfTuitionCurrent: number;
    pctOfTuitionCapacity: number;
    totalExclLeasePerStudent: number;
    // Per sq ft metrics
    costPerSqft: number;
    leasePerSqft: number;
  };

  // Break-even Analysis
  breakeven: {
    studentsFor15Pct: number;  // Students needed to reach 15% of tuition
    studentsFor20Pct: number;  // Students needed to reach 20% of tuition
    pctAt75Capacity: number;   // Facilities % at 75% capacity
    pctAt100Capacity: number;  // Facilities % at 100% capacity
  };
}

// ============================================================================
// KLAIR DATA - Facilities Costs by Company (from quickbooks_pl_data)
// ============================================================================

interface RawKlairCosts {
  lease_rent: number;
  fixed_security: number;
  fixed_it: number;
  fixed_landscaping: number;
  variable_janitorial: number;
  variable_utilities: number;
  variable_repairs: number;
  depreciated_capex: number;
}

const klairRawData: Record<string, RawKlairCosts> = {
  // Miami (Alpha School Miami complex)
  'miami': {
    lease_rent: 1275065,
    fixed_security: 105131,
    fixed_it: 48181,
    fixed_landscaping: 52063,
    variable_janitorial: 36751,
    variable_utilities: 29491,
    variable_repairs: 141767,
    depreciated_capex: 286027
  },
  // Alpha (Austin K-8 + Alpha High School)
  'alpha': {
    lease_rent: 1240846,
    fixed_security: 171802,
    fixed_it: 166607,
    fixed_landscaping: 29312,
    variable_janitorial: 120713,
    variable_utilities: 122620,
    variable_repairs: 378884,
    depreciated_capex: 127081
  },
  // Sports Academy Plano (75010)
  'sports_academy_75010_llc': {
    lease_rent: 699999,
    fixed_security: 38348,
    fixed_it: 15408,
    fixed_landscaping: 47177,
    variable_janitorial: 9164,
    variable_utilities: 104098,
    variable_repairs: 62045,
    depreciated_capex: 40509
  },
  // Alpha Schools LLC (Microschools portfolio)
  'alpha_schools_llc': {
    lease_rent: 369061,
    fixed_security: 37531,
    fixed_it: 35182,
    fixed_landscaping: 2525,
    variable_janitorial: 2600,
    variable_utilities: 43137,
    variable_repairs: 38567,
    depreciated_capex: 0
  },
  // Sports Academy Austin (78734)
  'sports_academy_78734_llc': {
    lease_rent: 332934,
    fixed_security: 69277,
    fixed_it: 36822,
    fixed_landscaping: 14346,
    variable_janitorial: 24464,
    variable_utilities: 18539,
    variable_repairs: 47551,
    depreciated_capex: 161497
  },
  // GT School (78626)
  'gtschool_78626_llc': {
    lease_rent: 248934,
    fixed_security: 0,
    fixed_it: 17459,
    fixed_landscaping: 11961,
    variable_janitorial: 31931,
    variable_utilities: 14490,
    variable_repairs: 25091,
    depreciated_capex: 43785
  },
  // eSports Academy
  'esports_academy_llc': {
    lease_rent: 102510,
    fixed_security: 0,
    fixed_it: 30705,
    fixed_landscaping: 7004,
    variable_janitorial: 17057,
    variable_utilities: 15211,
    variable_repairs: 10813,
    depreciated_capex: 27312
  },
  // Alpha School Santa Barbara (93101)
  'alpha_school_93101_llc': {
    lease_rent: 65410,
    fixed_security: 36959,
    fixed_it: 37491,
    fixed_landscaping: 0,
    variable_janitorial: 10250,
    variable_utilities: 0,
    variable_repairs: 13892,
    depreciated_capex: 80226
  },
  // Valenta Academy
  'valenta_academy': {
    lease_rent: 10610,
    fixed_security: 0,
    fixed_it: 1772,
    fixed_landscaping: 0,
    variable_janitorial: 3807,
    variable_utilities: 0,
    variable_repairs: 357,
    depreciated_capex: 19559
  },
  // Alpha School Fort Worth (76087)
  'alpha_school_76087_llc': {
    lease_rent: 6000,
    fixed_security: 0,
    fixed_it: 11013,
    fixed_landscaping: 0,
    variable_janitorial: 0,
    variable_utilities: 0,
    variable_repairs: 0,
    depreciated_capex: 15454
  },
  // Alpha School Charlotte (28269)
  'alpha_school_28269_llc': {
    lease_rent: 0,
    fixed_security: 0,
    fixed_it: 14474,
    fixed_landscaping: 0,
    variable_janitorial: 0,
    variable_utilities: 3030,
    variable_repairs: 17489,
    depreciated_capex: 35559
  }
};

// ============================================================================
// SCHOOL TYPE & TUITION TIER CLASSIFICATIONS
// ============================================================================

export type SchoolType = 'alpha-school' | 'microschool' | 'gt-school' | 'low-dollar' | 'growth';
export type TuitionTier = 'premium' | 'standard' | 'value' | 'economy';

export const schoolTypeLabels: Record<SchoolType, string> = {
  'alpha-school': 'Alpha School',
  'microschool': 'MicroSchool',
  'gt-school': 'GT / eSports',
  'low-dollar': 'Low Dollar School',
  'growth': 'Growth'
};

export const tuitionTierLabels: Record<TuitionTier, string> = {
  'premium': '$50K+',
  'standard': '$35K-$40K',
  'value': '$20K-$25K',
  'economy': '<$20K'
};

export const tuitionTierRanges: Record<TuitionTier, { min: number; max: number }> = {
  'premium': { min: 45000, max: 999999 },
  'standard': { min: 35000, max: 44999 },
  'value': { min: 20000, max: 34999 },
  'economy': { min: 0, max: 19999 }
};

// ============================================================================
// SCHOOL METADATA (enrollment, capacity, tuition, type)
// ============================================================================

interface SchoolMetadata {
  displayName: string;
  currentEnrollment: number;
  capacity: number;
  tuition: number;
  schoolType: SchoolType;
  tuitionTier: TuitionTier;
  sqft: number; // Gross square footage
}

const schoolMetadata: Record<string, SchoolMetadata> = {
  'miami': {
    displayName: 'Alpha Miami Campus',
    currentEnrollment: 67,
    capacity: 184, // from Excel
    tuition: 50000, // from Excel
    schoolType: 'alpha-school',
    tuitionTier: 'premium',
    sqft: 29808
  },
  'alpha': {
    displayName: 'Alpha Austin (K-8 + HS)',
    currentEnrollment: 211,
    capacity: 418, // 212 + 206 combined
    tuition: 40000,
    schoolType: 'alpha-school',
    tuitionTier: 'standard',
    sqft: 38780 // 19301 + 19479 combined
  },
  'sports_academy_75010_llc': {
    displayName: 'Texas Sports Academy - Plano',
    currentEnrollment: 85,
    capacity: 150,
    tuition: 25000,
    schoolType: 'gt-school',
    tuitionTier: 'value',
    sqft: 15000 // estimated based on similar facilities
  },
  'alpha_schools_llc': {
    displayName: 'Alpha Microschools Portfolio',
    currentEnrollment: 103,
    capacity: 200,
    tuition: 40000,
    schoolType: 'microschool',
    tuitionTier: 'standard',
    sqft: 25000 // estimated aggregate for portfolio
  },
  'sports_academy_78734_llc': {
    displayName: 'Texas Sports Academy - Austin',
    currentEnrollment: 72,
    capacity: 120,
    tuition: 25000,
    schoolType: 'gt-school',
    tuitionTier: 'value',
    sqft: 12000 // estimated
  },
  'gtschool_78626_llc': {
    displayName: 'GT School',
    currentEnrollment: 45,
    capacity: 115, // from Excel
    tuition: 25000,
    schoolType: 'gt-school',
    tuitionTier: 'value',
    sqft: 11517
  },
  'esports_academy_llc': {
    displayName: 'eSports Academy',
    currentEnrollment: 28,
    capacity: 80, // from Excel
    tuition: 25000, // corrected from Excel
    schoolType: 'gt-school',
    tuitionTier: 'value',
    sqft: 5569
  },
  'alpha_school_93101_llc': {
    displayName: 'Alpha Santa Barbara',
    currentEnrollment: 12,
    capacity: 78, // from Excel
    tuition: 50000,
    schoolType: 'microschool',
    tuitionTier: 'premium',
    sqft: 9691
  },
  'valenta_academy': {
    displayName: 'Valenta Academy',
    currentEnrollment: 8,
    capacity: 18, // from Excel
    tuition: 15000, // corrected from Excel - Low Dollar School
    schoolType: 'low-dollar',
    tuitionTier: 'economy',
    sqft: 1057
  },
  'alpha_school_76087_llc': {
    displayName: 'Alpha Fort Worth',
    currentEnrollment: 10,
    capacity: 18, // from Excel
    tuition: 40000,
    schoolType: 'microschool',
    tuitionTier: 'standard',
    sqft: 1320
  },
  'alpha_school_28269_llc': {
    displayName: 'Alpha Charlotte',
    currentEnrollment: 15,
    capacity: 25,
    tuition: 40000,
    schoolType: 'microschool',
    tuitionTier: 'standard',
    sqft: 3000 // estimated for new microschool
  }
};

// ============================================================================
// TRANSFORM RAW DATA TO 4-CATEGORY STRUCTURE
// ============================================================================

function transformToFourCategories(raw: RawKlairCosts): FourCategoryCosts {
  const lease: LeaseCategory = {
    rent: raw.lease_rent,
    total: raw.lease_rent
  };

  const fixedFacilities: FixedFacilitiesCategory = {
    security: raw.fixed_security,
    itMaintenance: raw.fixed_it,
    landscaping: raw.fixed_landscaping,
    total: raw.fixed_security + raw.fixed_it + raw.fixed_landscaping
  };

  const variableFacilities: VariableFacilitiesCategory = {
    janitorial: raw.variable_janitorial,
    utilities: raw.variable_utilities,
    repairs: raw.variable_repairs,
    total: raw.variable_janitorial + raw.variable_utilities + raw.variable_repairs
  };

  const depreciatedCapex: DepreciatedCapexCategory = {
    depreciation: raw.depreciated_capex,
    total: raw.depreciated_capex
  };

  const grandTotal = lease.total + fixedFacilities.total + variableFacilities.total + depreciatedCapex.total;
  const totalExcludingLease = fixedFacilities.total + variableFacilities.total + depreciatedCapex.total;

  return {
    lease,
    fixedFacilities,
    variableFacilities,
    depreciatedCapex,
    grandTotal,
    totalExcludingLease
  };
}

// ============================================================================
// BUILD SCHOOL DATA
// ============================================================================

export function buildSchoolData(): SchoolData[] {
  const schools: SchoolData[] = [];

  for (const [companyId, rawCosts] of Object.entries(klairRawData)) {
    const metadata = schoolMetadata[companyId];
    if (!metadata) continue;

    const costs = transformToFourCategories(rawCosts);
    const utilizationRate = metadata.currentEnrollment / metadata.capacity;

    const tuitionRevenueCurrent = metadata.currentEnrollment * metadata.tuition;
    const tuitionRevenueCapacity = metadata.capacity * metadata.tuition;

    // Break-even calculations
    // Students needed for facilities to be X% of tuition revenue
    // facilities_cost / (students * tuition) = target_pct
    // students = facilities_cost / (target_pct * tuition)
    const studentsFor15Pct = Math.ceil(costs.grandTotal / (0.15 * metadata.tuition));
    const studentsFor20Pct = Math.ceil(costs.grandTotal / (0.20 * metadata.tuition));

    // % of tuition at different capacity levels
    const capacity75 = Math.floor(metadata.capacity * 0.75);
    const revenue75 = capacity75 * metadata.tuition;
    const pctAt75Capacity = (costs.grandTotal / revenue75) * 100;
    const pctAt100Capacity = (costs.grandTotal / tuitionRevenueCapacity) * 100;

    // Square footage metrics
    const sqftPerStudent = metadata.sqft / Math.max(metadata.currentEnrollment, 1);
    const costPerSqft = metadata.sqft > 0 ? costs.grandTotal / metadata.sqft : 0;
    const leasePerSqft = metadata.sqft > 0 ? costs.lease.total / metadata.sqft : 0;

    schools.push({
      id: companyId,
      name: companyId,
      displayName: metadata.displayName,
      companyId,
      schoolType: metadata.schoolType,
      tuitionTier: metadata.tuitionTier,
      currentEnrollment: metadata.currentEnrollment,
      capacity: metadata.capacity,
      utilizationRate,
      tuition: metadata.tuition,
      sqft: metadata.sqft,
      sqftPerStudent,
      costs,
      metrics: {
        costPerStudentCurrent: costs.grandTotal / Math.max(metadata.currentEnrollment, 1),
        costPerStudentCapacity: costs.grandTotal / Math.max(metadata.capacity, 1),
        pctOfTuitionCurrent: (costs.grandTotal / tuitionRevenueCurrent) * 100,
        pctOfTuitionCapacity: (costs.grandTotal / tuitionRevenueCapacity) * 100,
        totalExclLeasePerStudent: costs.totalExcludingLease / Math.max(metadata.currentEnrollment, 1),
        costPerSqft,
        leasePerSqft
      },
      breakeven: {
        studentsFor15Pct,
        studentsFor20Pct,
        pctAt75Capacity,
        pctAt100Capacity
      }
    });
  }

  return schools.sort((a, b) => b.costs.grandTotal - a.costs.grandTotal);
}

// ============================================================================
// SCENARIO MODELING
// ============================================================================

export interface ScenarioResult {
  utilizationPct: number;
  totalEnrollment: number;
  avgCostPerStudent: number;
  avgPctOfTuition: number;
  fixedCostPerStudent: number;
  savingsVsCurrent: number;
}

export function calculateScenario(schools: SchoolData[], targetUtilizationPct: number): ScenarioResult {
  const targetUtilization = targetUtilizationPct / 100;

  let totalEnrollment = 0;
  let totalCosts = 0;
  let totalTuitionRevenue = 0;
  let totalFixedCosts = 0;
  let currentTotalCostPerStudent = 0;
  let currentTotalEnrollment = 0;

  for (const school of schools) {
    const scenarioEnrollment = Math.floor(school.capacity * targetUtilization);
    const scenarioRevenue = scenarioEnrollment * school.tuition;

    totalEnrollment += scenarioEnrollment;
    totalCosts += school.costs.grandTotal;
    totalTuitionRevenue += scenarioRevenue;
    totalFixedCosts += school.costs.lease.total + school.costs.fixedFacilities.total + school.costs.depreciatedCapex.total;

    currentTotalEnrollment += school.currentEnrollment;
    currentTotalCostPerStudent += school.costs.grandTotal;
  }

  const avgCostPerStudent = totalEnrollment > 0 ? totalCosts / totalEnrollment : 0;
  const avgPctOfTuition = totalTuitionRevenue > 0 ? (totalCosts / totalTuitionRevenue) * 100 : 0;
  const fixedCostPerStudent = totalEnrollment > 0 ? totalFixedCosts / totalEnrollment : 0;

  const currentAvgCostPerStudent = currentTotalEnrollment > 0 ? totalCosts / currentTotalEnrollment : 0;
  const savingsVsCurrent = currentAvgCostPerStudent - avgCostPerStudent;

  return {
    utilizationPct: targetUtilizationPct,
    totalEnrollment,
    avgCostPerStudent,
    avgPctOfTuition,
    fixedCostPerStudent,
    savingsVsCurrent
  };
}

// ============================================================================
// AGGREGATION BY SCHOOL TYPE & TUITION TIER
// ============================================================================

export interface SegmentSummary {
  segment: string;
  schoolCount: number;
  totalEnrollment: number;
  totalCapacity: number;
  utilizationPct: number;
  totalCosts: number;
  avgCostPerStudent: number;
  avgPctOfTuition: number;
  schools: SchoolData[];
}

export function aggregateBySchoolType(schools: SchoolData[]): SegmentSummary[] {
  const segments: Record<SchoolType, SchoolData[]> = {
    'alpha-school': [],
    'microschool': [],
    'gt-school': [],
    'low-dollar': [],
    'growth': []
  };

  for (const school of schools) {
    segments[school.schoolType].push(school);
  }

  return Object.entries(segments)
    .filter(([_, schoolList]) => schoolList.length > 0)
    .map(([type, schoolList]) => {
      const totalEnrollment = schoolList.reduce((sum, s) => sum + s.currentEnrollment, 0);
      const totalCapacity = schoolList.reduce((sum, s) => sum + s.capacity, 0);
      const totalCosts = schoolList.reduce((sum, s) => sum + s.costs.grandTotal, 0);
      const totalRevenue = schoolList.reduce((sum, s) => sum + s.currentEnrollment * s.tuition, 0);

      return {
        segment: schoolTypeLabels[type as SchoolType],
        schoolCount: schoolList.length,
        totalEnrollment,
        totalCapacity,
        utilizationPct: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,
        totalCosts,
        avgCostPerStudent: totalEnrollment > 0 ? totalCosts / totalEnrollment : 0,
        avgPctOfTuition: totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0,
        schools: schoolList
      };
    })
    .sort((a, b) => b.totalCosts - a.totalCosts);
}

export function aggregateByTuitionTier(schools: SchoolData[]): SegmentSummary[] {
  const segments: Record<TuitionTier, SchoolData[]> = {
    'premium': [],
    'standard': [],
    'value': [],
    'economy': []
  };

  for (const school of schools) {
    segments[school.tuitionTier].push(school);
  }

  return Object.entries(segments)
    .filter(([_, schoolList]) => schoolList.length > 0)
    .map(([tier, schoolList]) => {
      const totalEnrollment = schoolList.reduce((sum, s) => sum + s.currentEnrollment, 0);
      const totalCapacity = schoolList.reduce((sum, s) => sum + s.capacity, 0);
      const totalCosts = schoolList.reduce((sum, s) => sum + s.costs.grandTotal, 0);
      const totalRevenue = schoolList.reduce((sum, s) => sum + s.currentEnrollment * s.tuition, 0);

      return {
        segment: tuitionTierLabels[tier as TuitionTier],
        schoolCount: schoolList.length,
        totalEnrollment,
        totalCapacity,
        utilizationPct: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,
        totalCosts,
        avgCostPerStudent: totalEnrollment > 0 ? totalCosts / totalEnrollment : 0,
        avgPctOfTuition: totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0,
        schools: schoolList
      };
    })
    .sort((a, b) => b.totalCosts - a.totalCosts);
}

// ============================================================================
// PORTFOLIO SUMMARY
// ============================================================================

export interface PortfolioSummary {
  totalSchools: number;
  totalEnrollment: number;
  totalCapacity: number;
  avgUtilization: number;

  // 4-Category Totals
  totalLease: number;
  totalFixedFacilities: number;
  totalVariableFacilities: number;
  totalDepreciatedCapex: number;
  grandTotal: number;
  totalExcludingLease: number;

  // Per-Student Metrics
  avgCostPerStudent: number;
  avgExclLeasePerStudent: number;

  // Category Breakdown for Charts
  categoryBreakdown: {
    category: string;
    amount: number;
    pctOfTotal: number;
    color: string;
    subcategories?: { name: string; amount: number }[];
  }[];
}

export function calculatePortfolioSummary(schools: SchoolData[]): PortfolioSummary {
  const totalEnrollment = schools.reduce((sum, s) => sum + s.currentEnrollment, 0);
  const totalCapacity = schools.reduce((sum, s) => sum + s.capacity, 0);

  const totalLease = schools.reduce((sum, s) => sum + s.costs.lease.total, 0);
  const totalFixedFacilities = schools.reduce((sum, s) => sum + s.costs.fixedFacilities.total, 0);
  const totalVariableFacilities = schools.reduce((sum, s) => sum + s.costs.variableFacilities.total, 0);
  const totalDepreciatedCapex = schools.reduce((sum, s) => sum + s.costs.depreciatedCapex.total, 0);

  const grandTotal = totalLease + totalFixedFacilities + totalVariableFacilities + totalDepreciatedCapex;
  const totalExcludingLease = totalFixedFacilities + totalVariableFacilities + totalDepreciatedCapex;

  // Subcategory totals
  const totalSecurity = schools.reduce((sum, s) => sum + s.costs.fixedFacilities.security, 0);
  const totalIT = schools.reduce((sum, s) => sum + s.costs.fixedFacilities.itMaintenance, 0);
  const totalLandscaping = schools.reduce((sum, s) => sum + s.costs.fixedFacilities.landscaping, 0);
  const totalJanitorial = schools.reduce((sum, s) => sum + s.costs.variableFacilities.janitorial, 0);
  const totalUtilities = schools.reduce((sum, s) => sum + s.costs.variableFacilities.utilities, 0);
  const totalRepairs = schools.reduce((sum, s) => sum + s.costs.variableFacilities.repairs, 0);

  return {
    totalSchools: schools.length,
    totalEnrollment,
    totalCapacity,
    avgUtilization: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,

    totalLease,
    totalFixedFacilities,
    totalVariableFacilities,
    totalDepreciatedCapex,
    grandTotal,
    totalExcludingLease,

    avgCostPerStudent: totalEnrollment > 0 ? grandTotal / totalEnrollment : 0,
    avgExclLeasePerStudent: totalEnrollment > 0 ? totalExcludingLease / totalEnrollment : 0,

    categoryBreakdown: [
      {
        category: 'Lease',
        amount: totalLease,
        pctOfTotal: (totalLease / grandTotal) * 100,
        color: '#1e40af', // blue-800
        subcategories: [{ name: 'Rent', amount: totalLease }]
      },
      {
        category: 'Fixed Facilities Cost',
        amount: totalFixedFacilities,
        pctOfTotal: (totalFixedFacilities / grandTotal) * 100,
        color: '#7c3aed', // violet-600
        subcategories: [
          { name: 'Security', amount: totalSecurity },
          { name: 'IT Maintenance', amount: totalIT },
          { name: 'Landscaping', amount: totalLandscaping }
        ]
      },
      {
        category: 'Variable Facilities Cost',
        amount: totalVariableFacilities,
        pctOfTotal: (totalVariableFacilities / grandTotal) * 100,
        color: '#0d9488', // teal-600
        subcategories: [
          { name: 'Repairs', amount: totalRepairs },
          { name: 'Utilities', amount: totalUtilities },
          { name: 'Janitorial', amount: totalJanitorial }
        ]
      },
      {
        category: 'Depreciated Capex',
        amount: totalDepreciatedCapex,
        pctOfTotal: (totalDepreciatedCapex / grandTotal) * 100,
        color: '#dc2626', // red-600
        subcategories: [{ name: 'Depreciation/Amortization', amount: totalDepreciatedCapex }]
      }
    ].sort((a, b) => b.amount - a.amount)
  };
}

// ============================================================================
// KEY INSIGHTS
// ============================================================================

export interface Insight {
  id: string;
  category: 'fixed-cost-warning' | 'opportunity' | 'info';
  title: string;
  description: string;
  metric?: number;
  unit?: string;
}

export function generateInsights(summary: PortfolioSummary): Insight[] {
  const fixedPortion = summary.totalLease + summary.totalFixedFacilities + summary.totalDepreciatedCapex;
  const fixedPct = (fixedPortion / summary.grandTotal) * 100;

  return [
    {
      id: 'lease-commitment',
      category: 'fixed-cost-warning',
      title: 'Lease Commitment',
      description: `${((summary.totalLease / summary.grandTotal) * 100).toFixed(0)}% of facilities costs are locked into lease agreements. This is the cost you commit to on day 1.`,
      metric: summary.totalLease,
      unit: '$ annual lease'
    },
    {
      id: 'fixed-cost-burden',
      category: 'fixed-cost-warning',
      title: 'Total Fixed Cost Burden',
      description: `${fixedPct.toFixed(0)}% of facilities costs (Lease + Fixed Facilities + Depreciated Capex) cannot scale down with enrollment.`,
      metric: fixedPortion,
      unit: '$ fixed costs'
    },
    {
      id: 'excl-lease-spend',
      category: 'info',
      title: 'Total Excl. Lease',
      description: 'After signing the lease, this is what you spend on fixed facilities, variable facilities, and depreciated capex annually.',
      metric: summary.totalExcludingLease,
      unit: '$ annual (excl. lease)'
    },
    {
      id: 'per-student-burden',
      category: 'info',
      title: 'Per-Student Facilities Burden',
      description: `At current enrollment, each student carries ${summary.avgCostPerStudent.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} of facilities costs.`,
      metric: summary.avgCostPerStudent,
      unit: '$/student'
    },
    {
      id: 'capacity-opportunity',
      category: 'opportunity',
      title: 'Utilization Opportunity',
      description: `Portfolio is at ${summary.avgUtilization.toFixed(0)}% capacity. Reaching full capacity would spread fixed costs across ${summary.totalCapacity - summary.totalEnrollment} more students.`,
      metric: summary.avgUtilization,
      unit: '% utilization'
    }
  ];
}

// ============================================================================
// EXPENSE BEHAVIOR RULES (for reference)
// ============================================================================

export type CostBehavior = 'fixed' | 'semi-variable' | 'variable';

export interface ExpenseRule {
  id: string;
  name: string;
  category: 'lease' | 'fixed-facilities' | 'variable-facilities' | 'depreciated-capex';
  costType: CostBehavior;
  fixedPercent: number;
  variablePercent: number;
  description: string;
}

export const expenseRules: ExpenseRule[] = [
  {
    id: 'rent',
    name: 'Rent',
    category: 'lease',
    costType: 'fixed',
    fixedPercent: 1.0,
    variablePercent: 0,
    description: 'Lease commitment - locked in on day 1, cannot be reduced without relocating'
  },
  {
    id: 'security',
    name: 'Security Services',
    category: 'fixed-facilities',
    costType: 'fixed',
    fixedPercent: 0.9,
    variablePercent: 0.1,
    description: 'Base security required regardless of enrollment; minimal scaling'
  },
  {
    id: 'it-maintenance',
    name: 'IT Maintenance / Internet',
    category: 'fixed-facilities',
    costType: 'fixed',
    fixedPercent: 0.85,
    variablePercent: 0.15,
    description: 'Core infrastructure fixed; device/license costs scale slightly'
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    category: 'fixed-facilities',
    costType: 'fixed',
    fixedPercent: 1.0,
    variablePercent: 0,
    description: 'Grounds maintenance driven by space, not student count'
  },
  {
    id: 'janitorial',
    name: 'Janitorial / Toiletries',
    category: 'variable-facilities',
    costType: 'semi-variable',
    fixedPercent: 0.6,
    variablePercent: 0.4,
    description: 'Base cleaning fixed; supplies scale with occupancy'
  },
  {
    id: 'utilities',
    name: 'Utilities',
    category: 'variable-facilities',
    costType: 'semi-variable',
    fixedPercent: 0.5,
    variablePercent: 0.5,
    description: 'Base heating/cooling fixed; marginal usage scales with occupancy'
  },
  {
    id: 'repairs',
    name: 'Repairs / Maintenance',
    category: 'variable-facilities',
    costType: 'semi-variable',
    fixedPercent: 0.6,
    variablePercent: 0.4,
    description: 'Building maintenance mostly fixed; wear increases with usage'
  },
  {
    id: 'depreciation',
    name: 'Depreciation / Amortization',
    category: 'depreciated-capex',
    costType: 'fixed',
    fixedPercent: 1.0,
    variablePercent: 0,
    description: 'Capex depreciation is fully fixed - sunk cost from initial investment'
  }
];
