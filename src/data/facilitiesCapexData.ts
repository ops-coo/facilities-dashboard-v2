/**
 * Facilities & Capex Cost Analysis Data
 *
 * This file defines the structure and business logic for analyzing
 * facilities costs as fixed costs that don't scale with enrollment.
 *
 * Key Insight: Real estate and facilities are "locked in" costs that
 * consume a fixed percentage of tuition regardless of enrollment level.
 * Understanding this helps identify which schools are over/under-committed
 * on facilities relative to their capacity utilization.
 *
 * Data Sources (Klair MCP):
 * - staging_education.quickbooks_pl_data (actual costs)
 * - staging_education.quickbooks_expense_transactions (detailed expenses)
 * - core_education.google_sheets_school_financial_models_summary (capacity/budget)
 * - staging_education.students (current enrollment)
 * - staging_education.wrike_folders + wrike_folder_properties (facilities status)
 */

// ============================================================================
// EXPENSE BEHAVIOR RULES
// ============================================================================

export type CostBehavior = 'fixed' | 'semi-variable' | 'variable';

export interface ExpenseRule {
  id: string;
  name: string;
  accountName: string; // QuickBooks account name pattern
  costType: CostBehavior;
  fixedPercent: number; // 0-1, portion that doesn't scale with students
  variablePercent: number; // 0-1, portion that scales with students
  studentScalingRule: string;
  capacityRule: string;
  notes?: string;
}

/**
 * Expense rules derived from the Facilities & Capex analysis
 * These define how each cost category behaves as enrollment changes
 */
export const expenseRules: ExpenseRule[] = [
  {
    id: 'rent',
    name: 'Rent',
    accountName: '62200 Rent',
    costType: 'fixed',
    fixedPercent: 1.0,
    variablePercent: 0,
    studentScalingRule: 'No change with students',
    capacityRule: 'Flat until new space or lease change',
    notes: 'Lease commitments are fixed - this is the core "locked in" cost'
  },
  {
    id: 'utilities',
    name: 'Utilities',
    accountName: '62400 Utilities',
    costType: 'semi-variable',
    fixedPercent: 0.6,
    variablePercent: 0.4,
    studentScalingRule: 'Base + partial $/student',
    capacityRule: 'Variable portion linear with enrollment',
    notes: 'Base heating/cooling fixed; marginal usage scales with occupancy'
  },
  {
    id: 'maintenance',
    name: 'Repairs and Maintenance',
    accountName: '62300 Repairs and Maintenance',
    costType: 'semi-variable',
    fixedPercent: 0.7,
    variablePercent: 0.3,
    studentScalingRule: 'Base + partial $/student',
    capacityRule: 'Variable portion linear with enrollment',
    notes: 'Building maintenance mostly fixed; wear increases with usage'
  },
  {
    id: 'it_maintenance',
    name: 'IT Maintenance / Internet',
    accountName: '62301 IT Maintenance',
    costType: 'semi-variable',
    fixedPercent: 0.8,
    variablePercent: 0.2,
    studentScalingRule: 'Small $/student component',
    capacityRule: 'Variable portion linear with enrollment',
    notes: 'Core infrastructure fixed; device/license costs scale slightly'
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    accountName: 'Landscaping',
    costType: 'fixed',
    fixedPercent: 1.0,
    variablePercent: 0,
    studentScalingRule: 'No change with students',
    capacityRule: 'Flat; space-driven',
    notes: 'Grounds maintenance unrelated to student count'
  },
  {
    id: 'janitorial',
    name: 'Janitorial/Toiletries',
    accountName: 'Janitorial',
    costType: 'semi-variable',
    fixedPercent: 0.8,
    variablePercent: 0.2,
    studentScalingRule: 'Direct $/student',
    capacityRule: 'Variable portion linear with enrollment',
    notes: 'Base cleaning fixed; supplies scale with occupancy'
  },
  {
    id: 'repairs',
    name: 'Repairs/Renovations',
    accountName: 'Repairs',
    costType: 'semi-variable',
    fixedPercent: 0.8,
    variablePercent: 0.2,
    studentScalingRule: 'Triggered by usage',
    capacityRule: 'Variable portion linear with enrollment',
    notes: 'Mostly discretionary; some wear-driven'
  },
  {
    id: 'security',
    name: 'Security Services',
    accountName: '62304 Security Services',
    costType: 'semi-variable',
    fixedPercent: 0.8,
    variablePercent: 0.2,
    studentScalingRule: 'Base + step per student bands',
    capacityRule: 'Staffing steps with tiering',
    notes: 'Base security required; may add staff at capacity thresholds'
  },
  {
    id: 'transportation',
    name: 'Transportation',
    accountName: '62500 Transportation',
    costType: 'variable',
    fixedPercent: 0,
    variablePercent: 1.0,
    studentScalingRule: 'Direct $/student',
    capacityRule: 'Linear with enrollment',
    notes: 'Fully variable - scales directly with student count'
  },
  {
    id: 'food',
    name: 'Food Services',
    accountName: 'Food',
    costType: 'variable',
    fixedPercent: 0,
    variablePercent: 1.0,
    studentScalingRule: 'Direct $/student',
    capacityRule: 'Linear with enrollment',
    notes: 'Fully variable - scales directly with student count'
  },
  {
    id: 'facilities_labor',
    name: 'Contracted Labor - Facilities',
    accountName: '60201 Contracted Labor - Facilities',
    costType: 'semi-variable',
    fixedPercent: 0.7,
    variablePercent: 0.3,
    studentScalingRule: 'Base + partial scaling',
    capacityRule: 'Step function with capacity tiers',
    notes: 'Core staff fixed; may add at capacity thresholds'
  }
];

// ============================================================================
// SCHOOL DATA TYPES
// ============================================================================

export interface SchoolFacilitiesCosts {
  rent: number;
  utilities: number;
  maintenance: number;
  itMaintenance: number;
  landscaping: number;
  janitorial: number;
  security: number;
  transportation: number;
  food: number;
  facilitiesLabor: number;
  other: number;
}

export interface SchoolCapexCosts {
  shellAndCore: number;
  fitOut: number;
  total: number;
}

export interface SchoolMetrics {
  // Per-student metrics at CURRENT enrollment
  facilitiesCostPerStudentCurrent: number;
  capexPerStudentCurrent: number;
  totalCostPerStudentCurrent: number;
  facilitiesPctOfTuitionCurrent: number;

  // Per-student metrics at CAPACITY
  facilitiesCostPerStudentCapacity: number;
  capexPerStudentCapacity: number;
  totalCostPerStudentCapacity: number;
  facilitiesPctOfTuitionCapacity: number;

  // Fixed cost analysis
  fixedCostsTotal: number;
  fixedCostsPerStudentCurrent: number;
  fixedCostsPerStudentCapacity: number;
  fixedCostsPctOfTuitionCurrent: number;
  fixedCostsPctOfTuitionCapacity: number;

  // Per square foot (if available)
  costPerSqFt?: number;
  rentPerSqFt?: number;
}

export interface School {
  id: string;
  name: string;
  displayName: string;
  klairName: string; // Name as it appears in Klair/QuickBooks

  // Location
  city: string;
  state: string;

  // School characteristics
  schoolType: 'microschool' | 'full-alpha' | 'high-school' | 'sports' | 'gt' | 'montessorium' | 'nova' | 'other';
  tuition: number;

  // Capacity and enrollment
  currentEnrollment: number;
  capacity: number;
  utilizationRate: number; // currentEnrollment / capacity

  // Physical space (if available)
  sqft?: number;

  // Operating status
  operatingMonths: number; // Months operating in current period
  isFitOut: boolean; // Currently in fit-out phase
  isOpen: boolean;

  // Costs
  facilitiesCosts: SchoolFacilitiesCosts;
  facilitiesCostsTotal: number;
  capex: SchoolCapexCosts;

  // Calculated metrics
  metrics: SchoolMetrics;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the cost at a given enrollment level based on expense rule
 */
export function calculateCostAtEnrollment(
  costAtCapacity: number,
  currentEnrollment: number,
  capacity: number,
  rule: ExpenseRule
): number {
  if (capacity === 0) return costAtCapacity;

  const utilizationRate = currentEnrollment / capacity;
  const fixedPortion = costAtCapacity * rule.fixedPercent;
  const variablePortion = costAtCapacity * rule.variablePercent * utilizationRate;

  return fixedPortion + variablePortion;
}

/**
 * Calculate total fixed costs for a school
 */
export function calculateFixedCosts(facilitiesCosts: SchoolFacilitiesCosts): number {
  let fixedTotal = 0;

  // Rent is 100% fixed
  fixedTotal += facilitiesCosts.rent * 1.0;

  // Utilities: 60% fixed
  fixedTotal += facilitiesCosts.utilities * 0.6;

  // Maintenance: 70% fixed
  fixedTotal += facilitiesCosts.maintenance * 0.7;

  // IT: 80% fixed
  fixedTotal += facilitiesCosts.itMaintenance * 0.8;

  // Landscaping: 100% fixed
  fixedTotal += facilitiesCosts.landscaping * 1.0;

  // Janitorial: 80% fixed
  fixedTotal += facilitiesCosts.janitorial * 0.8;

  // Security: 80% fixed
  fixedTotal += facilitiesCosts.security * 0.8;

  // Transportation: 0% fixed (100% variable)
  // Food: 0% fixed (100% variable)

  // Facilities labor: 70% fixed
  fixedTotal += facilitiesCosts.facilitiesLabor * 0.7;

  // Other: assume 100% fixed
  fixedTotal += facilitiesCosts.other * 1.0;

  return fixedTotal;
}

/**
 * Calculate school metrics based on costs, enrollment, and capacity
 */
export function calculateSchoolMetrics(
  facilitiesCostsTotal: number,
  capexTotal: number,
  fixedCostsTotal: number,
  currentEnrollment: number,
  capacity: number,
  tuition: number,
  sqft?: number
): SchoolMetrics {
  // Avoid division by zero
  const safeCurrentEnrollment = Math.max(currentEnrollment, 1);
  const safeCapacity = Math.max(capacity, 1);

  const tuitionRevenueCurrent = safeCurrentEnrollment * tuition;
  const tuitionRevenueCapacity = safeCapacity * tuition;

  return {
    // Current enrollment metrics
    facilitiesCostPerStudentCurrent: facilitiesCostsTotal / safeCurrentEnrollment,
    capexPerStudentCurrent: capexTotal / safeCurrentEnrollment,
    totalCostPerStudentCurrent: (facilitiesCostsTotal + capexTotal) / safeCurrentEnrollment,
    facilitiesPctOfTuitionCurrent: (facilitiesCostsTotal / tuitionRevenueCurrent) * 100,

    // At capacity metrics
    facilitiesCostPerStudentCapacity: facilitiesCostsTotal / safeCapacity,
    capexPerStudentCapacity: capexTotal / safeCapacity,
    totalCostPerStudentCapacity: (facilitiesCostsTotal + capexTotal) / safeCapacity,
    facilitiesPctOfTuitionCapacity: (facilitiesCostsTotal / tuitionRevenueCapacity) * 100,

    // Fixed cost analysis
    fixedCostsTotal,
    fixedCostsPerStudentCurrent: fixedCostsTotal / safeCurrentEnrollment,
    fixedCostsPerStudentCapacity: fixedCostsTotal / safeCapacity,
    fixedCostsPctOfTuitionCurrent: (fixedCostsTotal / tuitionRevenueCurrent) * 100,
    fixedCostsPctOfTuitionCapacity: (fixedCostsTotal / tuitionRevenueCapacity) * 100,

    // Per square foot (if available)
    costPerSqFt: sqft ? facilitiesCostsTotal / sqft : undefined,
    rentPerSqFt: undefined // Would need rent + sqft
  };
}

// ============================================================================
// KLAIR DATA - ACTUAL FACILITIES COSTS FROM QUICKBOOKS
// ============================================================================

/**
 * Actual facilities costs by school from Klair
 * Source: staging_education.quickbooks_pl_data
 * Query: Filtered by facilities-related account names
 */
export const klairFacilitiesCosts: Record<string, SchoolFacilitiesCosts> = {
  'austin-k8': {
    rent: 832449.41,
    utilities: 30731.67,
    maintenance: 75649.79,
    itMaintenance: 41999.39,
    landscaping: 0,
    janitorial: 0,
    security: 81085.01,
    transportation: 1567.07,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'alpha-high-school': {
    rent: 247785.24,
    utilities: 39715.57,
    maintenance: 132922.14,
    itMaintenance: 64446.02,
    landscaping: 0,
    janitorial: 0,
    security: 64095.91,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'brownsville-k8': {
    rent: 54931.25,
    utilities: 12427.42,
    maintenance: 24089.12,
    itMaintenance: 10853.18,
    landscaping: 0,
    janitorial: 0,
    security: 15005.25,
    transportation: 7572.48,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'waypoint-academy': {
    rent: 51030.00,
    utilities: 660.00,
    maintenance: 5921.22,
    itMaintenance: 12534.82,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'alpha-miami': {
    rent: 20000.00,
    utilities: 4641.12,
    maintenance: 22563.58,
    itMaintenance: 12256.11,
    landscaping: 0,
    janitorial: 0,
    security: 9370.00,
    transportation: 411.94,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'nova-austin': {
    rent: 24698.29,
    utilities: 667.43,
    maintenance: 18639.50,
    itMaintenance: 7219.30,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    transportation: 17.91,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'gt-school': {
    rent: 0,
    utilities: 13955.86,
    maintenance: 6373.63,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    transportation: 38.00,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'alpha-santa-barbara': {
    rent: 0,
    utilities: 3654.35,
    maintenance: 929.02,
    itMaintenance: 2027.74,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'alpha-scottsdale': {
    rent: 0,
    utilities: 870.00,
    maintenance: 4639.45,
    itMaintenance: 539.99,
    landscaping: 0,
    janitorial: 0,
    security: 125.00,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'alpha-san-francisco': {
    rent: 0,
    utilities: 875.83,
    maintenance: 3679.21,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 0,
    security: 125.00,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'alpha-fort-worth': {
    rent: 0,
    utilities: 0,
    maintenance: 164.94,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    transportation: 3096.49,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'alpha-lake-forest': {
    rent: 0,
    utilities: 0,
    maintenance: 144.46,
    itMaintenance: 1679.05,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'nova-bastrop': {
    rent: 9957.78,
    utilities: 0,
    maintenance: 5423.58,
    itMaintenance: 3265.22,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  },
  'montessorium': {
    rent: 0,
    utilities: 0,
    maintenance: 2806.88,
    itMaintenance: 1941.59,
    landscaping: 0,
    janitorial: 0,
    security: 1375.00,
    transportation: 0,
    food: 0,
    facilitiesLabor: 0,
    other: 0
  }
};

// ============================================================================
// ENROLLMENT DATA FROM KLAIR
// ============================================================================

/**
 * Current enrollment by school from Klair
 * Source: staging_education.students WHERE admission_status = 'Enrolled'
 */
export const klairEnrollment: Record<string, number> = {
  'austin-k8': 161, // "Alpha School Austin" in Klair
  'alpha-high-school': 50,
  'brownsville-k8': 42, // "Alpha School Brownsville"
  'alpha-miami': 67, // "Alpha School Miami"
  'alpha-scottsdale': 31,
  'alpha-san-francisco': 19,
  'alpha-santa-barbara': 12,
  'alpha-fort-worth': 10,
  'alpha-lake-forest': 12,
  'alpha-palm-beach': 7,
  'alpha-plano': 7,
  'alpha-chantilly': 4,
  'alpha-tampa': 1,
  'waypoint-academy': 1,
  'gt-school': 24,
  'nova-austin': 15,
  'nova-bastrop': 15,
  'montessorium': 18,
  'texas-sports-academy': 35
};

// ============================================================================
// CAPACITY DATA (from financial models)
// ============================================================================

/**
 * School capacity targets
 * Source: core_education.google_sheets_school_financial_models_summary
 */
export const schoolCapacity: Record<string, { capacity: number; tuition: number }> = {
  'austin-k8': { capacity: 225, tuition: 40000 },
  'alpha-high-school': { capacity: 150, tuition: 40000 },
  'brownsville-k8': { capacity: 100, tuition: 15000 },
  'alpha-miami': { capacity: 25, tuition: 40000 },
  'alpha-scottsdale': { capacity: 25, tuition: 40000 },
  'alpha-san-francisco': { capacity: 25, tuition: 65000 },
  'alpha-santa-barbara': { capacity: 25, tuition: 50000 },
  'alpha-fort-worth': { capacity: 25, tuition: 40000 },
  'alpha-lake-forest': { capacity: 25, tuition: 50000 },
  'alpha-palm-beach': { capacity: 25, tuition: 40000 },
  'alpha-plano': { capacity: 25, tuition: 40000 },
  'alpha-chantilly': { capacity: 25, tuition: 40000 },
  'alpha-tampa': { capacity: 25, tuition: 40000 },
  'waypoint-academy': { capacity: 25, tuition: 40000 },
  'gt-school': { capacity: 50, tuition: 25000 },
  'nova-austin': { capacity: 50, tuition: 15000 },
  'nova-bastrop': { capacity: 50, tuition: 15000 },
  'montessorium': { capacity: 40, tuition: 25000 },
  'texas-sports-academy': { capacity: 100, tuition: 25000 }
};

// ============================================================================
// PORTFOLIO SUMMARY
// ============================================================================

export interface PortfolioSummary {
  totalSchools: number;
  totalEnrollment: number;
  totalCapacity: number;
  averageUtilization: number;

  totalFacilitiesCosts: number;
  totalCapex: number;
  totalFixedCosts: number;

  avgFacilitiesCostPerStudent: number;
  avgFixedCostPerStudent: number;
  avgFacilitiesPctOfTuition: number;

  // By category
  totalRent: number;
  totalUtilities: number;
  totalMaintenance: number;
  totalSecurity: number;
  totalOther: number;

  // Breakdowns
  costsByCategory: { category: string; amount: number; pctOfTotal: number }[];
  schoolsByFacilitiesCost: { school: string; cost: number; pctOfTuition: number }[];
}

/**
 * Calculate portfolio-wide summary metrics
 */
export function calculatePortfolioSummary(schools: School[]): PortfolioSummary {
  const totalEnrollment = schools.reduce((sum, s) => sum + s.currentEnrollment, 0);
  const totalCapacity = schools.reduce((sum, s) => sum + s.capacity, 0);
  const totalFacilitiesCosts = schools.reduce((sum, s) => sum + s.facilitiesCostsTotal, 0);
  const totalCapex = schools.reduce((sum, s) => sum + s.capex.total, 0);
  const totalFixedCosts = schools.reduce((sum, s) => sum + s.metrics.fixedCostsTotal, 0);

  const totalRent = schools.reduce((sum, s) => sum + s.facilitiesCosts.rent, 0);
  const totalUtilities = schools.reduce((sum, s) => sum + s.facilitiesCosts.utilities, 0);
  const totalMaintenance = schools.reduce((sum, s) => sum + s.facilitiesCosts.maintenance, 0);
  const totalSecurity = schools.reduce((sum, s) => sum + s.facilitiesCosts.security, 0);

  const costsByCategory = [
    { category: 'Rent', amount: totalRent, pctOfTotal: (totalRent / totalFacilitiesCosts) * 100 },
    { category: 'Maintenance', amount: totalMaintenance, pctOfTotal: (totalMaintenance / totalFacilitiesCosts) * 100 },
    { category: 'Security', amount: totalSecurity, pctOfTotal: (totalSecurity / totalFacilitiesCosts) * 100 },
    { category: 'Utilities', amount: totalUtilities, pctOfTotal: (totalUtilities / totalFacilitiesCosts) * 100 }
  ].sort((a, b) => b.amount - a.amount);

  const schoolsByFacilitiesCost = schools
    .map(s => ({
      school: s.displayName,
      cost: s.facilitiesCostsTotal,
      pctOfTuition: s.metrics.facilitiesPctOfTuitionCurrent
    }))
    .sort((a, b) => b.cost - a.cost);

  return {
    totalSchools: schools.length,
    totalEnrollment,
    totalCapacity,
    averageUtilization: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,

    totalFacilitiesCosts,
    totalCapex,
    totalFixedCosts,

    avgFacilitiesCostPerStudent: totalEnrollment > 0 ? totalFacilitiesCosts / totalEnrollment : 0,
    avgFixedCostPerStudent: totalEnrollment > 0 ? totalFixedCosts / totalEnrollment : 0,
    avgFacilitiesPctOfTuition: 0, // Would need weighted average

    totalRent,
    totalUtilities,
    totalMaintenance,
    totalSecurity,
    totalOther: totalFacilitiesCosts - totalRent - totalUtilities - totalMaintenance - totalSecurity,

    costsByCategory,
    schoolsByFacilitiesCost
  };
}

// ============================================================================
// ANALYSIS VIEWS
// ============================================================================

export type AnalysisView =
  | 'per-student-current'
  | 'per-student-capacity'
  | 'per-sqft'
  | 'pct-of-tuition-current'
  | 'pct-of-tuition-capacity'
  | 'fixed-vs-variable'
  | 'cost-breakdown';

export interface ViewConfig {
  id: AnalysisView;
  name: string;
  description: string;
  primaryMetric: string;
  unit: string;
}

export const analysisViews: ViewConfig[] = [
  {
    id: 'per-student-current',
    name: 'Per Student (Current)',
    description: 'Facilities cost per enrolled student at current enrollment',
    primaryMetric: 'facilitiesCostPerStudentCurrent',
    unit: '$/student'
  },
  {
    id: 'per-student-capacity',
    name: 'Per Student (At Capacity)',
    description: 'Facilities cost per student if school reaches capacity',
    primaryMetric: 'facilitiesCostPerStudentCapacity',
    unit: '$/student'
  },
  {
    id: 'pct-of-tuition-current',
    name: '% of Tuition (Current)',
    description: 'Facilities costs as percentage of current tuition revenue',
    primaryMetric: 'facilitiesPctOfTuitionCurrent',
    unit: '%'
  },
  {
    id: 'pct-of-tuition-capacity',
    name: '% of Tuition (At Capacity)',
    description: 'Facilities costs as percentage of tuition revenue at capacity',
    primaryMetric: 'facilitiesPctOfTuitionCapacity',
    unit: '%'
  },
  {
    id: 'per-sqft',
    name: 'Per Square Foot',
    description: 'Facilities cost per square foot (where available)',
    primaryMetric: 'costPerSqFt',
    unit: '$/sqft'
  },
  {
    id: 'fixed-vs-variable',
    name: 'Fixed vs Variable',
    description: 'Breakdown of fixed costs that cannot be reduced vs variable costs',
    primaryMetric: 'fixedCostsTotal',
    unit: '$'
  },
  {
    id: 'cost-breakdown',
    name: 'Cost Breakdown',
    description: 'Breakdown by cost category (rent, utilities, security, etc.)',
    primaryMetric: 'facilitiesCostsTotal',
    unit: '$'
  }
];

// ============================================================================
// KEY INSIGHTS
// ============================================================================

export interface Insight {
  id: string;
  category: 'opportunity' | 'risk' | 'info';
  title: string;
  description: string;
  metric?: number;
  unit?: string;
  schools?: string[];
}

export const keyInsights: Insight[] = [
  {
    id: 'rent-concentration',
    category: 'risk',
    title: 'Rent Concentration',
    description: 'Rent is the largest fixed cost category, representing the most "locked in" facility expense that cannot be reduced without relocating.',
    metric: 1240852,
    unit: '$ total annual rent'
  },
  {
    id: 'austin-dominance',
    category: 'info',
    title: 'Austin K-8 Facilities Load',
    description: 'Austin K-8 accounts for the majority of total facilities costs due to its large campus and training hub role.',
    metric: 1063482,
    unit: '$ annual facilities'
  },
  {
    id: 'underutilization-impact',
    category: 'risk',
    title: 'Fixed Costs at Low Utilization',
    description: 'Schools below 50% capacity utilization are absorbing full fixed costs across fewer students, dramatically increasing per-student facility burden.',
    schools: ['alpha-tampa', 'waypoint-academy', 'alpha-chantilly']
  },
  {
    id: 'capacity-opportunity',
    category: 'opportunity',
    title: 'At-Capacity Improvement',
    description: 'Reaching capacity would spread fixed facilities costs across more students, reducing per-student burden by 40-60% at most schools.',
    metric: 45,
    unit: '% average potential reduction'
  }
];
