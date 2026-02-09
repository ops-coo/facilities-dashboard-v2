/**
 * Facilities & Capex Cost Analysis Data
 *
 * 6-CATEGORY STRUCTURE:
 * 1. LEASE - Rent commitment (fixed, locked-in day 1)
 * 2. FIXED FACILITIES COST - Security, IT maintenance, landscaping (doesn't scale with students)
 * 3. VARIABLE FACILITIES COST - Janitorial, utilities, repairs/maintenance (scales with students)
 * 4. STUDENT SERVICES - Food services, transportation (scales with students)
 * 5. ANNUAL DEPRECIATION - Annualized capex depreciation
 * 6. CAPEX BUILDOUT - One-time capital expenditure (shown separately, not in annual total)
 *
 * Data Source: "Facilities & Capex Costs (1).xlsx" - Summary - Based on Expense down
 * Enrollment Source: "Schools Data Sheet .xlsx" - School Data (confirmed enrollments)
 * Year-end actual costs for 26 schools with operational data.
 */

// ============================================================================
// 6-CATEGORY COST STRUCTURE
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

export interface StudentServicesCategory {
  foodServices: number;
  transportation: number;
  total: number;
}

export interface AnnualDepreciationCategory {
  depreciation: number;
  total: number;
}

export interface SixCategoryCosts {
  lease: LeaseCategory;
  fixedFacilities: FixedFacilitiesCategory;
  variableFacilities: VariableFacilitiesCategory;
  studentServices: StudentServicesCategory;
  annualDepreciation: AnnualDepreciationCategory;
  capexBuildout: number; // One-time, NOT included in grandTotal
  grandTotal: number; // Sum of categories 1-5 (annual costs only)
  totalExcludingLease: number;
}

// Backward compatibility alias
export type FourCategoryCosts = SixCategoryCosts;

// ============================================================================
// EXPENSE RULE PRESETS
// ============================================================================

export type ExpensePreset = 'dashboard' | 'expense-report';

export interface ExpenseRuleSet {
  security: { fixed: number; variable: number };
  itMaintenance: { fixed: number; variable: number };
  landscaping: { fixed: number; variable: number };
  janitorial: { fixed: number; variable: number };
  utilities: { fixed: number; variable: number };
  repairs: { fixed: number; variable: number };
  foodServices: { fixed: number; variable: number };
  transportation: { fixed: number; variable: number };
}

export const expensePresets: Record<ExpensePreset, ExpenseRuleSet> = {
  dashboard: {
    security: { fixed: 0.90, variable: 0.10 },
    itMaintenance: { fixed: 0.85, variable: 0.15 },
    landscaping: { fixed: 1.00, variable: 0.00 },
    janitorial: { fixed: 0.60, variable: 0.40 },
    utilities: { fixed: 0.50, variable: 0.50 },
    repairs: { fixed: 0.60, variable: 0.40 },
    foodServices: { fixed: 0.20, variable: 0.80 },
    transportation: { fixed: 0.30, variable: 0.70 },
  },
  'expense-report': {
    security: { fixed: 0.80, variable: 0.20 },
    itMaintenance: { fixed: 0.80, variable: 0.20 },
    landscaping: { fixed: 1.00, variable: 0.00 },
    janitorial: { fixed: 0.80, variable: 0.20 },
    utilities: { fixed: 0.60, variable: 0.40 },
    repairs: { fixed: 0.70, variable: 0.30 },
    foodServices: { fixed: 0.20, variable: 0.80 },
    transportation: { fixed: 0.30, variable: 0.70 },
  },
};

export const presetLabels: Record<ExpensePreset, string> = {
  dashboard: 'Dashboard Original',
  'expense-report': 'Expense Report Splits',
};

// ============================================================================
// SCHOOL DATA TYPES
// ============================================================================

export type HealthScore = 'green' | 'yellow' | 'red' | 'gray';

export interface SchoolData {
  id: string;
  name: string;
  displayName: string;
  companyId: string;

  schoolType: SchoolType;
  tuitionTier: TuitionTier;
  targetPct: number; // Margin target: facilities as % of tuition (varies by tuition tier)

  currentEnrollment: number;
  capacity: number;
  utilizationRate: number;
  tuition: number;
  isOperating: boolean;

  sqft: number;
  sqftPerStudent: number;

  costs: SixCategoryCosts;

  revenue: {
    current: number;
    atCapacity: number;
    revenueGap: number;
  };

  healthScore: HealthScore;
  healthVerdict: string;

  marginalCostPerStudent: number;
  sunkCosts: number;
  controllableCosts: number;

  metrics: {
    costPerStudentCurrent: number;
    costPerStudentCapacity: number;
    pctOfTuitionCurrent: number;
    pctOfTuitionCapacity: number;
    totalExclLeasePerStudent: number;
    costPerSqft: number;
    leasePerSqft: number;
    fixedFacPerSqft: number;
    variableFacPerSqft: number;
    studentSvcPerSqft: number;
    depreciationPerSqft: number;
    netFacFeePerSqft: number;
  };

  breakeven: {
    studentsForTarget: number;
    studentsFor20Pct: number;
    pctAt75Capacity: number;
    pctAt100Capacity: number;
  };

  budget: {
    modelFacPerStudent: number;    // Col W: budget fac ex-capex per student
    modelCapexPerStudent: number;  // Col X: budget capex per student
    modelNetFacPerStudent: number; // Col Y: budget total per student (W+X)
    actualNetFacPerStudent: number;
    netFacDelta: number;
    netFacDeltaPct: number;
    capexBuildout: number;
    capexBudget: number;
    capexDelta: number;
    capexDeltaPct: number;
    capexPerSeat: number;
    annualDepreciation: number;
    depreciationPerSeat: number;
    totalVariance: number;
  };
}

// ============================================================================
// SCHOOL TYPES & TUITION TIERS
// ============================================================================

export type SchoolType = 'alpha-school' | 'growth-alpha' | 'microschool' | 'alternative' | 'low-dollar';
export type TuitionTier = 'premium' | 'standard' | 'value' | 'economy';

export const schoolTypeLabels: Record<SchoolType, string> = {
  'alpha-school': 'Alpha School',
  'growth-alpha': 'Growth Alpha',
  microschool: 'MicroSchool',
  alternative: 'Alternative Models',
  'low-dollar': 'Low Cost Models',
};

export const tuitionTierLabels: Record<TuitionTier, string> = {
  premium: '$50K+',
  standard: '$35K-$40K',
  value: '$20K-$25K',
  economy: '<$20K',
};

// ============================================================================
// CAPEX BUDGET RATES — per capacity student per year of depreciation
// Formula: rate × capacity × depr_period = approved CapEx budget
// ============================================================================

export const capexBudgetRatePerStudent: Record<SchoolType, number> = {
  'alpha-school': 1000,
  'growth-alpha': 750,
  microschool: 500,
  alternative: 500,   // TBD — placeholder
  'low-dollar': 500,  // TBD — placeholder
};

export const tuitionTierRanges: Record<TuitionTier, { min: number; max: number }> = {
  premium: { min: 45000, max: 999999 },
  standard: { min: 35000, max: 44999 },
  value: { min: 20000, max: 34999 },
  economy: { min: 0, max: 19999 },
};

// ============================================================================
// CATEGORY COLORS
// ============================================================================

export const categoryColors = {
  lease: '#1e40af',           // blue-800
  fixedFacilities: '#7c3aed', // violet-600
  variableFacilities: '#0d9488', // teal-600
  studentServices: '#ea580c', // orange-600
  annualDepreciation: '#475569', // slate-600
  capexBuildout: '#dc2626',   // red-600
};

// ============================================================================
// RAW SCHOOL DATA (from "Summary - Based on Expense down" sheet)
// ============================================================================

interface RawSchoolEntry {
  displayName: string;
  currentEnrollment: number;
  capacity: number;
  schoolType: SchoolType;
  tuitionTier: TuitionTier;
  tuition: number;
  sqft: number;
  // Cost data
  lease: number;
  capexBuildout: number;
  utilities: number;
  maintenance: number;
  itMaintenance: number;
  landscaping: number;
  janitorial: number;
  security: number;
  foodServices: number;
  transportation: number;
  totalExcCapex: number;
  totalIncCapex: number;
  // Budget — from "Summary - Based on Expense down" cols W-Y (Per Original Approved Financial Model)
  modelFacPerStudent: number;      // Col W: Facilities cost p/s exc. CapEx
  modelCapexPerStudent: number;    // Col X: CapEx cost p/s
  modelTotalCostPerStudent: number; // Col Y: Total cost p/s (= W + X)
  delta: number;
}

const rawSchoolData: Record<string, RawSchoolEntry> = {
  alpha_miami: {
    displayName: 'Alpha Miami',
    currentEnrollment: 69,
    capacity: 184,
    schoolType: 'alpha-school',
    tuitionTier: 'premium',
    tuition: 50000,
    sqft: 30000,
    lease: 1811276,
    capexBuildout: 1367252,
    utilities: 136199,
    maintenance: 404913,
    itMaintenance: 121161,
    landscaping: 96487,
    janitorial: 110450,
    security: 314640,
    foodServices: 573405,
    transportation: 183403,
    totalExcCapex: 3751935,
    totalIncCapex: 3888660,
    modelFacPerStudent: 12054,
    modelCapexPerStudent: 7431,
    modelTotalCostPerStudent: 19485,
    delta: 8337,
  },
  alpha_ny: {
    displayName: 'Alpha New York',
    currentEnrollment: 33,
    capacity: 123,
    schoolType: 'growth-alpha',
    tuitionTier: 'premium',
    tuition: 65000,
    sqft: 15350,
    lease: 1200881,
    capexBuildout: 946720,
    utilities: 122883,
    maintenance: 187532,
    itMaintenance: 27762,
    landscaping: 0,
    janitorial: 12572,
    security: 326819,
    foodServices: 577064,
    transportation: 1202272,
    totalExcCapex: 3657784,
    totalIncCapex: 3752456,
    modelFacPerStudent: 12920,
    modelCapexPerStudent: 7697,
    modelTotalCostPerStudent: 20617,
    delta: 16818,
  },
  alpha_hs_austin: {
    displayName: 'Alpha High School Austin',
    currentEnrollment: 61,
    capacity: 206,
    schoolType: 'alpha-school',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 22000,
    lease: 613400,
    capexBuildout: 953196,
    utilities: 179838,
    maintenance: 517486,
    itMaintenance: 296421,
    landscaping: 9776,
    janitorial: 129432,
    security: 285000,
    foodServices: 779264,
    transportation: 83196,
    totalExcCapex: 2893812,
    totalIncCapex: 2989132,
    modelFacPerStudent: 11133,
    modelCapexPerStudent: 4627,
    modelTotalCostPerStudent: 15760,
    delta: 2915,
  },
  austin_spyglass: {
    displayName: 'Alpha Austin Spyglass',
    currentEnrollment: 212,
    capacity: 212,
    schoolType: 'alpha-school',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 20047,
    lease: 1708000,
    capexBuildout: 1043292,
    utilities: 73123,
    maintenance: 160825,
    itMaintenance: 52914,
    landscaping: 10679,
    janitorial: 85917,
    security: 285000,
    foodServices: 271436,
    transportation: 19948,
    totalExcCapex: 2667841,
    totalIncCapex: 2772171,
    modelFacPerStudent: 12191,
    modelCapexPerStudent: 4921,
    modelTotalCostPerStudent: 17112,
    delta: 394,
  },
  gt_school: {
    displayName: 'GT School',
    currentEnrollment: 21,
    capacity: 180,
    schoolType: 'alternative',
    tuitionTier: 'value',
    tuition: 25000,
    sqft: 12664,
    lease: 497868,
    capexBuildout: 916436,
    utilities: 221529,
    maintenance: 175635,
    itMaintenance: 91240,
    landscaping: 9494,
    janitorial: 52310,
    security: 99066,
    foodServices: 720481,
    transportation: 145640,
    totalExcCapex: 2013263,
    totalIncCapex: 2104907,
    modelFacPerStudent: 5627,
    modelCapexPerStudent: 5091,
    modelTotalCostPerStudent: 10718,
    delta: 5558,
  },
  alpha_sf: {
    displayName: 'Alpha San Francisco',
    currentEnrollment: 19,
    capacity: 68,
    schoolType: 'growth-alpha',
    tuitionTier: 'premium',
    tuition: 65000,
    sqft: 8099,
    lease: 364455,
    capexBuildout: 394691,
    utilities: 121070,
    maintenance: 380727,
    itMaintenance: 81228,
    landscaping: 0,
    janitorial: 7443,
    security: 129580,
    foodServices: 521516,
    transportation: 49389,
    totalExcCapex: 1655408,
    totalIncCapex: 1852754,
    modelFacPerStudent: 7515,
    modelCapexPerStudent: 5804,
    modelTotalCostPerStudent: 13319,
    delta: 16829,
  },
  esports_austin: {
    displayName: 'eSports Academy Austin',
    currentEnrollment: 15,
    capacity: 80,
    schoolType: 'alternative',
    tuitionTier: 'value',
    tuition: 25000,
    sqft: 5569,
    lease: 201000,
    capexBuildout: 60000,
    utilities: 121900,
    maintenance: 176782,
    itMaintenance: 150183,
    landscaping: 15282,
    janitorial: 23235,
    security: 99066,
    foodServices: 507873,
    transportation: 0,
    totalExcCapex: 1295321,
    totalIncCapex: 1325321,
    modelFacPerStudent: 2700,
    modelCapexPerStudent: 750,
    modelTotalCostPerStudent: 3450,
    delta: 13492,
  },
  alpha_piedmont: {
    displayName: 'Alpha Piedmont',
    currentEnrollment: 0,
    capacity: 106,
    schoolType: 'growth-alpha',
    tuitionTier: 'premium',
    tuition: 65000,
    sqft: 5000,
    lease: 251996,
    capexBuildout: 1765580,
    utilities: 0,
    maintenance: 0,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 0,
    security: 181602,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 433598,
    totalIncCapex: 1316388,
    modelFacPerStudent: 4606,
    modelCapexPerStudent: 16720,
    modelTotalCostPerStudent: 21326,
    delta: -500,
  },
  nova_austin: {
    displayName: 'Nova Austin',
    currentEnrollment: 22,
    capacity: 252,
    schoolType: 'low-dollar',
    tuitionTier: 'economy',
    tuition: 15000,
    sqft: 8261,
    lease: 204000,
    capexBuildout: 400000,
    utilities: 149718,
    maintenance: 95716,
    itMaintenance: 64526,
    landscaping: 10825,
    janitorial: 26537,
    security: 99066,
    foodServices: 479693,
    transportation: 0,
    totalExcCapex: 1130080,
    totalIncCapex: 1170080,
    modelFacPerStudent: 1694,
    modelCapexPerStudent: 1587,
    modelTotalCostPerStudent: 3281,
    delta: 2790,
  },
  alpha_santa_barbara: {
    displayName: 'Alpha Santa Barbara',
    currentEnrollment: 13,
    capacity: 78,
    schoolType: 'growth-alpha',
    tuitionTier: 'premium',
    tuition: 50000,
    sqft: 13820,
    lease: 156984,
    capexBuildout: 750000,
    utilities: 10381,
    maintenance: 196965,
    itMaintenance: 259935,
    landscaping: 0,
    janitorial: 64587,
    security: 114000,
    foodServices: 246914,
    transportation: 0,
    totalExcCapex: 1049766,
    totalIncCapex: 1124766,
    modelFacPerStudent: 3974,
    modelCapexPerStudent: 9615,
    modelTotalCostPerStudent: 13590,
    delta: 9484,
  },
  alpha_palo_alto: {
    displayName: 'Alpha Palo Alto',
    currentEnrollment: 0,
    capacity: 47,
    schoolType: 'growth-alpha',
    tuitionTier: 'premium',
    tuition: 65000,
    sqft: 3000,
    lease: 275442,
    capexBuildout: 1420970,
    utilities: 0,
    maintenance: 0,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 0,
    security: 95361,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 370803,
    totalIncCapex: 1081288,
    modelFacPerStudent: 8430,
    modelCapexPerStudent: 30389,
    modelTotalCostPerStudent: 38818,
    delta: -500,
  },
  alpha_boston: {
    displayName: 'Alpha Boston',
    currentEnrollment: 0,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'premium',
    tuition: 65000,
    sqft: 3000,
    lease: 272736,
    capexBuildout: 496442,
    utilities: 0,
    maintenance: 1481,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 0,
    security: 123766,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 397983,
    totalIncCapex: 646204,
    modelFacPerStudent: 16360,
    modelCapexPerStudent: 19858,
    modelTotalCostPerStudent: 36218,
    delta: -441,
  },
  brownsville: {
    displayName: 'Alpha Brownsville',
    currentEnrollment: 42,
    capacity: 55,
    schoolType: 'low-dollar',
    tuitionTier: 'economy',
    tuition: 15000,
    sqft: 4417,
    lease: 36000,
    capexBuildout: 105049,
    utilities: 29375,
    maintenance: 63073,
    itMaintenance: 45771,
    landscaping: 28250,
    janitorial: 2522,
    security: 129580,
    foodServices: 202148,
    transportation: 11503,
    totalExcCapex: 548223,
    totalIncCapex: 558728,
    modelFacPerStudent: 4400,
    modelCapexPerStudent: 1910,
    modelTotalCostPerStudent: 6310,
    delta: 5568,
  },
  alpha_chantilly: {
    displayName: 'Alpha Chantilly',
    currentEnrollment: 4,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'premium',
    tuition: 65000,
    sqft: 24820,
    lease: 100000,
    capexBuildout: 25000,
    utilities: 0,
    maintenance: 64525,
    itMaintenance: 21464,
    landscaping: 0,
    janitorial: 13544,
    security: 103075,
    foodServices: 117943,
    transportation: 69449,
    totalExcCapex: 489999,
    totalIncCapex: 502499,
    modelFacPerStudent: 4250,
    modelCapexPerStudent: 1000,
    modelTotalCostPerStudent: 5250,
    delta: 15350,
  },
  alpha_scottsdale: {
    displayName: 'Alpha Scottsdale',
    currentEnrollment: 33,
    capacity: 38,
    schoolType: 'growth-alpha',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 20600,
    lease: 70992,
    capexBuildout: 67159,
    utilities: 1663,
    maintenance: 26606,
    itMaintenance: 1723,
    landscaping: 75,
    janitorial: 5673,
    security: 111150,
    foodServices: 132902,
    transportation: 84218,
    totalExcCapex: 435002,
    totalIncCapex: 468581,
    modelFacPerStudent: 4958,
    modelCapexPerStudent: 1767,
    modelTotalCostPerStudent: 6725,
    delta: 6490,
  },
  alpha_tampa: {
    displayName: 'Alpha Tampa',
    currentEnrollment: 1,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 3000,
    lease: 157620,
    capexBuildout: 69615,
    utilities: 12484,
    maintenance: 52409,
    itMaintenance: 0,
    landscaping: 91730,
    janitorial: 0,
    security: 119453,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 433696,
    totalIncCapex: 468503,
    modelFacPerStudent: 11333,
    modelCapexPerStudent: 2785,
    modelTotalCostPerStudent: 14118,
    delta: 6015,
  },
  alpha_fort_worth: {
    displayName: 'Alpha Fort Worth',
    currentEnrollment: 11,
    capacity: 18,
    schoolType: 'microschool',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 1320,
    lease: 132160,
    capexBuildout: 136418,
    utilities: 2640,
    maintenance: 2874,
    itMaintenance: 6776,
    landscaping: 0,
    janitorial: 3804,
    security: 111872,
    foodServices: 81046,
    transportation: 32888,
    totalExcCapex: 374060,
    totalIncCapex: 442268,
    modelFacPerStudent: 16243,
    modelCapexPerStudent: 7579,
    modelTotalCostPerStudent: 23822,
    delta: 4538,
  },
  alpha_waypoint: {
    displayName: 'Alpha Waypoint Academy',
    currentEnrollment: 1,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 748,
    lease: 78000,
    capexBuildout: 169211,
    utilities: 4946,
    maintenance: 49738,
    itMaintenance: 123452,
    landscaping: 18339,
    janitorial: 14424,
    security: 54226,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 343125,
    totalIncCapex: 427731,
    modelFacPerStudent: 3370,
    modelCapexPerStudent: 6768,
    modelTotalCostPerStudent: 10138,
    delta: 10355,
  },
  alpha_charlotte: {
    displayName: 'Alpha Charlotte',
    currentEnrollment: 0,
    capacity: 40,
    schoolType: 'growth-alpha',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 17018,
    lease: 100000,
    capexBuildout: 25000,
    utilities: 49172,
    maintenance: 82050,
    itMaintenance: 134791,
    landscaping: 0,
    janitorial: 14478,
    security: 0,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 380491,
    totalIncCapex: 392991,
    modelFacPerStudent: 2656,
    modelCapexPerStudent: 625,
    modelTotalCostPerStudent: 3281,
    delta: 6856,
  },
  alpha_houston: {
    displayName: 'Alpha Houston',
    currentEnrollment: 0,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'standard',
    tuition: 40000,
    sqft: 2500,
    lease: 80000,
    capexBuildout: 61819,
    utilities: 0,
    maintenance: 463,
    itMaintenance: 208223,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 288686,
    totalIncCapex: 319596,
    modelFacPerStudent: 3450,
    modelCapexPerStudent: 2473,
    modelTotalCostPerStudent: 5923,
    delta: 8097,
  },
  alpha_plano: {
    displayName: 'Alpha Plano',
    currentEnrollment: 10,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'premium',
    tuition: 50000,
    sqft: 2002,
    lease: 100000,
    capexBuildout: 25000,
    utilities: 0,
    maintenance: 19424,
    itMaintenance: 17389,
    landscaping: 0,
    janitorial: 9257,
    security: 0,
    foodServices: 95882,
    transportation: 0,
    totalExcCapex: 241951,
    totalIncCapex: 254451,
    modelFacPerStudent: 4250,
    modelCapexPerStudent: 1000,
    modelTotalCostPerStudent: 5250,
    delta: 5428,
  },
  alpha_lake_forest: {
    displayName: 'Alpha Lake Forest',
    currentEnrollment: 15,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'premium',
    tuition: 50000,
    sqft: 6124,
    lease: 100000,
    capexBuildout: 125492,
    utilities: 33995,
    maintenance: 10319,
    itMaintenance: 17136,
    landscaping: 0,
    janitorial: 2524,
    security: 0,
    foodServices: 4113,
    transportation: 0,
    totalExcCapex: 168087,
    totalIncCapex: 230833,
    modelFacPerStudent: 4250,
    modelCapexPerStudent: 5020,
    modelTotalCostPerStudent: 9270,
    delta: 2473,
  },
  alpha_palm_beach: {
    displayName: 'Alpha Palm Beach',
    currentEnrollment: 7,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'premium',
    tuition: 50000,
    sqft: 13000,
    lease: 95715,
    capexBuildout: 24949,
    utilities: 0,
    maintenance: 2831,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 5185,
    security: 0,
    foodServices: 41227,
    transportation: 38793,
    totalExcCapex: 183751,
    totalIncCapex: 196225,
    modelFacPerStudent: 4079,
    modelCapexPerStudent: 998,
    modelTotalCostPerStudent: 5077,
    delta: 3271,
  },
  nova_bastrop: {
    displayName: 'Nova Bastrop',
    currentEnrollment: 15,
    capacity: 18,
    schoolType: 'low-dollar',
    tuitionTier: 'economy',
    tuition: 15000,
    sqft: 680,
    lease: 144000,
    capexBuildout: 46357,
    utilities: 0,
    maintenance: 11307,
    itMaintenance: 9313,
    landscaping: 0,
    janitorial: 5291,
    security: 0,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 169911,
    totalIncCapex: 193089,
    modelFacPerStudent: 2667,
    modelCapexPerStudent: 2575,
    modelTotalCostPerStudent: 5242,
    delta: 6772,
  },
  alpha_raleigh: {
    displayName: 'Alpha Raleigh',
    currentEnrollment: 0,
    capacity: 25,
    schoolType: 'microschool',
    tuitionTier: 'premium',
    tuition: 50000,
    sqft: 1480,
    lease: 100000,
    capexBuildout: 25000,
    utilities: 0,
    maintenance: 24153,
    itMaintenance: 0,
    landscaping: 0,
    janitorial: 18588,
    security: 0,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 142740,
    totalIncCapex: 155240,
    modelFacPerStudent: 4250,
    modelCapexPerStudent: 1000,
    modelTotalCostPerStudent: 5250,
    delta: 1460,
  },
  montessorium: {
    displayName: 'Montessorium Brushy Creek',
    currentEnrollment: 18,
    capacity: 25,
    schoolType: 'alternative',
    tuitionTier: 'value',
    tuition: 25000,
    sqft: 14462,
    lease: 75000,
    capexBuildout: 25000,
    utilities: 0,
    maintenance: 10746,
    itMaintenance: 5760,
    landscaping: 0,
    janitorial: 0,
    security: 0,
    foodServices: 0,
    transportation: 0,
    totalExcCapex: 91506,
    totalIncCapex: 104006,
    modelFacPerStudent: 3250,
    modelCapexPerStudent: 1000,
    modelTotalCostPerStudent: 4250,
    delta: 410,
  },
};

// ============================================================================
// TRANSFORM RAW DATA TO 6-CATEGORY STRUCTURE
// ============================================================================

function transformToSixCategories(raw: RawSchoolEntry): SixCategoryCosts {
  const lease: LeaseCategory = {
    rent: raw.lease,
    total: raw.lease,
  };

  const fixedFacilities: FixedFacilitiesCategory = {
    security: raw.security,
    itMaintenance: raw.itMaintenance,
    landscaping: raw.landscaping,
    total: raw.security + raw.itMaintenance + raw.landscaping,
  };

  const variableFacilities: VariableFacilitiesCategory = {
    janitorial: raw.janitorial,
    utilities: raw.utilities,
    repairs: raw.maintenance,
    total: raw.janitorial + raw.utilities + raw.maintenance,
  };

  const studentServices: StudentServicesCategory = {
    foodServices: raw.foodServices,
    transportation: raw.transportation,
    total: raw.foodServices + raw.transportation,
  };

  const annualDepreciation: AnnualDepreciationCategory = {
    depreciation: raw.totalIncCapex - raw.totalExcCapex,
    total: raw.totalIncCapex - raw.totalExcCapex,
  };

  const grandTotal = raw.totalIncCapex;
  const totalExcludingLease = grandTotal - raw.lease;

  return {
    lease,
    fixedFacilities,
    variableFacilities,
    studentServices,
    annualDepreciation,
    capexBuildout: raw.capexBuildout,
    grandTotal,
    totalExcludingLease,
  };
}

// ============================================================================
// MARGIN TARGETS BY TUITION TIER
// ============================================================================

export function getTargetPct(tuition: number): number {
  if (tuition >= 65000) return 20;
  if (tuition > 40000) return 10;
  return 5;
}

export function getTargetLabel(tuition: number): string {
  if (tuition >= 65000) return '$65k+ → 20%';
  if (tuition > 40000) return '$50k → 10%';
  return '≤$40k → 5%';
}

// ============================================================================
// PROGRAM + MISC FEES (from 2HL Approved Models)
// Programs decline with scale for Alpha tiers ($40K+)
// Misc declines with scale for all tiers except Low Dollar
// ============================================================================

export function getProgramsPerStudent(tuition: number, students: number): number {
  if (tuition <= 15000) return 1250;
  if (tuition <= 25000) return 2500;
  // Alpha $40K+
  if (students <= 50) return 12000;
  if (students <= 100) return 12000 - 3500 * (students - 50) / 50;
  return 8500;
}

export function getMiscPerStudent(tuition: number, students: number): number {
  if (tuition <= 15000) return 1500; // flat for low dollar
  if (students <= 50) return 3500;
  if (students <= 100) return 3500 - 2000 * (students - 50) / 50;
  return 1500;
}

export function getTimeback(tuition: number): number {
  // 20% of tuition with $5K floor. $75K capped at $15K per model note.
  return Math.min(15000, Math.max(5000, tuition * 0.20));
}

// ============================================================================
// STAFFING MODELS (from 2HL Approved Models)
// Different tiers have different staffing structures and ratios
// ============================================================================

export function getStaffingCost(tuition: number, students: number): number {
  const loading = 1.15;

  if (tuition <= 15000) {
    // LOW DOLLAR: $75K guides, 13:1 small / 25:1 large, room assistants at scale
    if (students < 100) {
      // Small: 1 Lead Guide + regular guides at 13:1, no admin/HoS
      const totalGuides = Math.max(2, Math.ceil(students / 13));
      const leadGuides = 1;
      const regularGuides = totalGuides - leadGuides;
      return (leadGuides * 150000 + regularGuides * 75000) * loading;
    } else {
      // Large: 25:1 guides + 2 Room Assistants + HoS + Admin
      const guides = Math.ceil(students / 25);
      const guideCost = guides * 75000;
      const otherHC = 2 * 40000 + 150000 + 60000; // 2 Room Asst + HoS + Admin
      return (guideCost + otherHC) * loading;
    }
  }

  if (tuition <= 25000) {
    // ALTERNATIVE ($25K): $100K guides, 13:1 small / 25:1 large, room assistants at scale
    if (students < 100) {
      // Small: 1 Lead Guide + regular guides at 13:1, no admin/HoS
      const totalGuides = Math.max(2, Math.ceil(students / 13));
      const leadGuides = 1;
      const regularGuides = totalGuides - leadGuides;
      return (leadGuides * 150000 + regularGuides * 100000) * loading;
    } else {
      // Large: 2 Leads + guides at 25:1 + 2 Room Asst + HoS + Admin
      const totalGuides = Math.ceil(students / 25);
      const leadGuides = Math.min(2, totalGuides);
      const regularGuides = Math.max(0, totalGuides - leadGuides);
      const guideCost = leadGuides * 150000 + regularGuides * 100000;
      const otherHC = 2 * 60000 + 200000 + 60000; // 2 Room Asst + HoS + Admin
      return (guideCost + otherHC) * loading;
    }
  }

  // ALPHA ($40K+): 11:1 ratio, lead guides, HoS at 100+
  const isPremium = tuition >= 50000;
  const hosBase = isPremium ? 300000 : 200000;
  const leadBase = isPremium ? 200000 : 150000;
  const guideBase = isPremium ? 120000 : 100000;
  const adminBase = isPremium ? 75000 : 60000;

  // Admin: always 1
  let cost = adminBase * loading;

  // Head of School: required at ≥100 students
  if (students >= 100) cost += hosBase * loading;

  // Guides: 11:1 ratio
  const totalGuides = Math.ceil(students / 11);
  // Lead guides: 1 per ~38 students, max 4
  const leadGuides = Math.min(4, Math.max(1, Math.ceil(students / 38)));
  const regularGuides = Math.max(0, totalGuides - leadGuides);

  cost += leadGuides * leadBase * loading;
  cost += regularGuides * guideBase * loading;

  return cost;
}

// Full unit economics: Revenue - All Costs = Margin
export interface UnitEconomicsResult {
  students: number;
  tuition: number;
  revenue: number;
  staffing: number;
  staffingPerStudent: number;
  facilities: number;
  facilitiesPerStudent: number;
  capexAnnual: number;
  capexPerStudent: number;
  programs: number;
  programsPerStudent: number;
  misc: number;
  miscPerStudent: number;
  timeback: number;
  timebackPerStudent: number;
  totalCosts: number;
  totalPerStudent: number;
  margin: number;
  marginPerStudent: number;
  marginPct: number;
}

export function calculateUnitEconomics(
  tuition: number,
  students: number,
  facilitiesTotal: number,
  capexAnnual: number,
): UnitEconomicsResult {
  const revenue = tuition * students;
  const staffing = getStaffingCost(tuition, students);
  const programs = getProgramsPerStudent(tuition, students) * students;
  const misc = getMiscPerStudent(tuition, students) * students;
  const timeback = getTimeback(tuition) * students;

  const totalCosts = staffing + facilitiesTotal + capexAnnual + programs + misc + timeback;
  const margin = revenue - totalCosts;

  return {
    students,
    tuition,
    revenue,
    staffing,
    staffingPerStudent: staffing / Math.max(students, 1),
    facilities: facilitiesTotal,
    facilitiesPerStudent: facilitiesTotal / Math.max(students, 1),
    capexAnnual,
    capexPerStudent: capexAnnual / Math.max(students, 1),
    programs,
    programsPerStudent: programs / Math.max(students, 1),
    misc,
    miscPerStudent: misc / Math.max(students, 1),
    timeback,
    timebackPerStudent: timeback / Math.max(students, 1),
    totalCosts,
    totalPerStudent: totalCosts / Math.max(students, 1),
    margin,
    marginPerStudent: margin / Math.max(students, 1),
    marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
  };
}

// ============================================================================
// BUILD SCHOOL DATA
// ============================================================================

export function buildSchoolData(): SchoolData[] {
  const schools: SchoolData[] = [];

  for (const [id, raw] of Object.entries(rawSchoolData)) {
    const costs = transformToSixCategories(raw);
    const enrollment = Math.max(raw.currentEnrollment, 1);
    const utilizationRate = raw.currentEnrollment / raw.capacity;
    const isOperating = raw.currentEnrollment > 0;

    const revenueCurrent = raw.currentEnrollment * raw.tuition;
    const revenueAtCapacity = raw.capacity * raw.tuition;
    const revenueGap = revenueAtCapacity - revenueCurrent;

    const tuitionRevenueCurrent = enrollment * raw.tuition;
    const tuitionRevenueCapacity = raw.capacity * raw.tuition;

    const schoolTargetPct = getTargetPct(raw.tuition);
    const targetFraction = schoolTargetPct / 100;
    const studentsForTarget = Math.ceil(costs.grandTotal / (targetFraction * raw.tuition));
    const studentsFor20Pct = Math.ceil(costs.grandTotal / (0.20 * raw.tuition));

    const capacity75 = Math.floor(raw.capacity * 0.75);
    const revenue75 = capacity75 * raw.tuition;
    const pctAt75Capacity = revenue75 > 0 ? (costs.grandTotal / revenue75) * 100 : 0;
    const pctAt100Capacity = tuitionRevenueCapacity > 0
      ? (costs.grandTotal / tuitionRevenueCapacity) * 100
      : 0;

    const sqftPerStudent = raw.sqft / enrollment;
    const costPerSqft = raw.sqft > 0 ? costs.grandTotal / raw.sqft : 0;
    const leasePerSqft = raw.sqft > 0 ? costs.lease.total / raw.sqft : 0;
    const fixedFacPerSqft = raw.sqft > 0 ? costs.fixedFacilities.total / raw.sqft : 0;
    const variableFacPerSqft = raw.sqft > 0 ? costs.variableFacilities.total / raw.sqft : 0;
    const studentSvcPerSqft = raw.sqft > 0 ? costs.studentServices.total / raw.sqft : 0;
    const depreciationPerSqft = raw.sqft > 0 ? costs.annualDepreciation.total / raw.sqft : 0;
    const netFacFeePerSqft = raw.sqft > 0 ? raw.totalExcCapex / raw.sqft : 0;

    const pctOfTuitionCurrent = (costs.grandTotal / tuitionRevenueCurrent) * 100;

    // Sunk vs controllable
    const sunkCosts = costs.lease.total + costs.annualDepreciation.total;
    const controllableCosts = costs.fixedFacilities.total +
      costs.variableFacilities.total + costs.studentServices.total;

    // Marginal cost = variable-only costs per student (what the NEXT student costs)
    const variableTotal = costs.variableFacilities.total + costs.studentServices.total;
    const marginalCostPerStudent = isOperating
      ? variableTotal / raw.currentEnrollment
      : variableTotal > 0 ? variableTotal : 0;

    // Health score — uses tier-specific targetPct, NOT hardcoded thresholds
    // Red = can't reach target even at 100% capacity
    // Green = well utilized AND within target
    // Yellow = either under-utilized or over target
    let healthScore: HealthScore;
    let healthVerdict: string;
    if (!isOperating) {
      healthScore = 'gray';
      healthVerdict = 'Pre-Opening';
    } else if (pctAt100Capacity > schoolTargetPct * 1.5) {
      // Even at full capacity, costs exceed 1.5× the tuition-tier target — structural problem
      healthScore = 'red';
      healthVerdict = 'Renegotiate';
    } else if (utilizationRate >= 0.7 && pctOfTuitionCurrent <= schoolTargetPct) {
      healthScore = 'green';
      healthVerdict = 'Keeper';
    } else if (utilizationRate >= 0.7) {
      // Seats are filled but costs still above target
      healthScore = 'yellow';
      healthVerdict = 'Fix It';
    } else {
      // Under-utilized — fill seats first
      healthScore = 'yellow';
      healthVerdict = 'Fill It';
    }

    // Budget: from cols W-Y of "Summary - Based on Expense down"
    // W = modelFacPerStudent (fac ex-capex), X = modelCapexPerStudent, Y = modelTotalCostPerStudent
    const actualNetFacPerStudent = raw.totalExcCapex / raw.capacity;
    const netFacDelta = actualNetFacPerStudent - raw.modelFacPerStudent;
    const netFacDeltaPct = raw.modelFacPerStudent > 0
      ? (netFacDelta / raw.modelFacPerStudent) * 100
      : 0;
    const totalVariance = netFacDelta * raw.capacity;

    // CapEx budget = rate × capacity × depreciation period
    // rate varies by school type: Alpha=$1000, Growth=$750, Micro=$500
    const annualDeprAmount = costs.annualDepreciation.total;
    const deprPeriod = annualDeprAmount > 0 ? raw.capexBuildout / annualDeprAmount : 10; // default 10yr
    const capexRate = capexBudgetRatePerStudent[raw.schoolType];
    const capexBudgetDerived = capexRate * raw.capacity * deprPeriod;
    const capexDelta = raw.capexBuildout - capexBudgetDerived;
    const capexDeltaPct = capexBudgetDerived > 0
      ? (capexDelta / capexBudgetDerived) * 100
      : 0;

    schools.push({
      id,
      name: id,
      displayName: raw.displayName,
      companyId: id,
      schoolType: raw.schoolType,
      tuitionTier: raw.tuitionTier,
      targetPct: schoolTargetPct,
      currentEnrollment: raw.currentEnrollment,
      capacity: raw.capacity,
      utilizationRate,
      tuition: raw.tuition,
      isOperating,
      sqft: raw.sqft,
      sqftPerStudent,
      costs,
      revenue: { current: revenueCurrent, atCapacity: revenueAtCapacity, revenueGap },
      healthScore,
      healthVerdict,
      marginalCostPerStudent,
      sunkCosts,
      controllableCosts,
      metrics: {
        costPerStudentCurrent: costs.grandTotal / enrollment,
        costPerStudentCapacity: costs.grandTotal / raw.capacity,
        pctOfTuitionCurrent,
        pctOfTuitionCapacity: tuitionRevenueCapacity > 0
          ? (costs.grandTotal / tuitionRevenueCapacity) * 100
          : 0,
        totalExclLeasePerStudent: costs.totalExcludingLease / enrollment,
        costPerSqft,
        leasePerSqft,
        fixedFacPerSqft,
        variableFacPerSqft,
        studentSvcPerSqft,
        depreciationPerSqft,
        netFacFeePerSqft,
      },
      breakeven: {
        studentsForTarget,
        studentsFor20Pct,
        pctAt75Capacity,
        pctAt100Capacity,
      },
      budget: {
        modelFacPerStudent: raw.modelFacPerStudent,
        modelCapexPerStudent: raw.modelCapexPerStudent,
        modelNetFacPerStudent: raw.modelTotalCostPerStudent,
        actualNetFacPerStudent,
        netFacDelta,
        netFacDeltaPct,
        capexBuildout: raw.capexBuildout,
        capexBudget: capexBudgetDerived,
        capexDelta,
        capexDeltaPct,
        capexPerSeat: raw.capexBuildout / raw.capacity,
        annualDepreciation: costs.annualDepreciation.total,
        depreciationPerSeat: costs.annualDepreciation.total / raw.capacity,
        totalVariance,
      },
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

export function calculateScenario(
  schools: SchoolData[],
  targetUtilizationPct: number,
  preset: ExpensePreset = 'dashboard'
): ScenarioResult {
  const targetUtilization = targetUtilizationPct / 100;
  const rules = expensePresets[preset];

  let totalEnrollment = 0;
  let totalAdjustedCosts = 0;
  let totalTuitionRevenue = 0;
  let totalFixedCosts = 0;
  let currentTotalEnrollment = 0;

  for (const school of schools) {
    const scenarioEnrollment = Math.floor(school.capacity * targetUtilization);
    const currentEnrollment = Math.max(school.currentEnrollment, 1);
    const enrollmentRatio = scenarioEnrollment / currentEnrollment;

    // Fixed costs stay the same, variable costs scale with enrollment ratio
    const adjustedFixedFac =
      school.costs.fixedFacilities.security * rules.security.fixed +
      school.costs.fixedFacilities.security * rules.security.variable * enrollmentRatio +
      school.costs.fixedFacilities.itMaintenance * rules.itMaintenance.fixed +
      school.costs.fixedFacilities.itMaintenance * rules.itMaintenance.variable * enrollmentRatio +
      school.costs.fixedFacilities.landscaping;

    const adjustedVarFac =
      school.costs.variableFacilities.janitorial * rules.janitorial.fixed +
      school.costs.variableFacilities.janitorial * rules.janitorial.variable * enrollmentRatio +
      school.costs.variableFacilities.utilities * rules.utilities.fixed +
      school.costs.variableFacilities.utilities * rules.utilities.variable * enrollmentRatio +
      school.costs.variableFacilities.repairs * rules.repairs.fixed +
      school.costs.variableFacilities.repairs * rules.repairs.variable * enrollmentRatio;

    const adjustedStudentSvc =
      school.costs.studentServices.foodServices * rules.foodServices.fixed +
      school.costs.studentServices.foodServices * rules.foodServices.variable * enrollmentRatio +
      school.costs.studentServices.transportation * rules.transportation.fixed +
      school.costs.studentServices.transportation * rules.transportation.variable * enrollmentRatio;

    const adjustedTotal =
      school.costs.lease.total +
      adjustedFixedFac +
      adjustedVarFac +
      adjustedStudentSvc +
      school.costs.annualDepreciation.total;

    const scenarioRevenue = scenarioEnrollment * school.tuition;

    totalEnrollment += scenarioEnrollment;
    totalAdjustedCosts += adjustedTotal;
    totalTuitionRevenue += scenarioRevenue;
    totalFixedCosts += school.costs.lease.total + school.costs.annualDepreciation.total;
    currentTotalEnrollment += school.currentEnrollment;
  }

  const avgCostPerStudent = totalEnrollment > 0 ? totalAdjustedCosts / totalEnrollment : 0;
  const avgPctOfTuition = totalTuitionRevenue > 0
    ? (totalAdjustedCosts / totalTuitionRevenue) * 100
    : 0;
  const fixedCostPerStudent = totalEnrollment > 0 ? totalFixedCosts / totalEnrollment : 0;

  const totalOriginalCosts = schools.reduce((sum, s) => sum + s.costs.grandTotal, 0);
  const currentAvgCostPerStudent = currentTotalEnrollment > 0
    ? totalOriginalCosts / currentTotalEnrollment
    : 0;
  const savingsVsCurrent = currentAvgCostPerStudent - avgCostPerStudent;

  return {
    utilizationPct: targetUtilizationPct,
    totalEnrollment,
    avgCostPerStudent,
    avgPctOfTuition,
    fixedCostPerStudent,
    savingsVsCurrent,
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
    'growth-alpha': [],
    microschool: [],
    alternative: [],
    'low-dollar': [],
  };

  for (const school of schools) {
    segments[school.schoolType].push(school);
  }

  return Object.entries(segments)
    .filter(([, schoolList]) => schoolList.length > 0)
    .map(([type, schoolList]) => {
      const totalEnrollment = schoolList.reduce((sum, s) => sum + s.currentEnrollment, 0);
      const totalCapacity = schoolList.reduce((sum, s) => sum + s.capacity, 0);
      const totalCosts = schoolList.reduce((sum, s) => sum + s.costs.grandTotal, 0);
      const totalRevenue = schoolList.reduce(
        (sum, s) => sum + Math.max(s.currentEnrollment, 1) * s.tuition,
        0
      );

      return {
        segment: schoolTypeLabels[type as SchoolType],
        schoolCount: schoolList.length,
        totalEnrollment,
        totalCapacity,
        utilizationPct: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,
        totalCosts,
        avgCostPerStudent: totalEnrollment > 0 ? totalCosts / totalEnrollment : 0,
        avgPctOfTuition: totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0,
        schools: schoolList,
      };
    })
    .sort((a, b) => b.totalCosts - a.totalCosts);
}

export function aggregateByTuitionTier(schools: SchoolData[]): SegmentSummary[] {
  const segments: Record<TuitionTier, SchoolData[]> = {
    premium: [],
    standard: [],
    value: [],
    economy: [],
  };

  for (const school of schools) {
    segments[school.tuitionTier].push(school);
  }

  return Object.entries(segments)
    .filter(([, schoolList]) => schoolList.length > 0)
    .map(([tier, schoolList]) => {
      const totalEnrollment = schoolList.reduce((sum, s) => sum + s.currentEnrollment, 0);
      const totalCapacity = schoolList.reduce((sum, s) => sum + s.capacity, 0);
      const totalCosts = schoolList.reduce((sum, s) => sum + s.costs.grandTotal, 0);
      const totalRevenue = schoolList.reduce(
        (sum, s) => sum + Math.max(s.currentEnrollment, 1) * s.tuition,
        0
      );

      return {
        segment: tuitionTierLabels[tier as TuitionTier],
        schoolCount: schoolList.length,
        totalEnrollment,
        totalCapacity,
        utilizationPct: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,
        totalCosts,
        avgCostPerStudent: totalEnrollment > 0 ? totalCosts / totalEnrollment : 0,
        avgPctOfTuition: totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0,
        schools: schoolList,
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

  totalLease: number;
  totalFixedFacilities: number;
  totalVariableFacilities: number;
  totalStudentServices: number;
  totalAnnualDepreciation: number;
  totalCapexBuildout: number;
  grandTotal: number;
  totalExcludingLease: number;

  // Legacy aliases for backward compatibility
  totalDepreciatedCapex: number;

  avgCostPerStudent: number;
  avgExclLeasePerStudent: number;

  // Revenue context
  totalRevenueCurrent: number;
  totalRevenueAtCapacity: number;
  totalRevenueGap: number;
  facilitiesPctOfRevenue: number;

  // Controllability
  totalSunkCosts: number;
  totalControllableCosts: number;
  avgMarginalCost: number;

  // Space / per-sqft averages
  totalSqft: number;
  totalNetFacFees: number;
  avgLeasePerSqft: number;
  avgFixedFacPerSqft: number;
  avgVariableFacPerSqft: number;
  avgStudentSvcPerSqft: number;
  avgDepreciationPerSqft: number;
  avgTotalCostPerSqft: number;
  avgNetFacFeePerSqft: number;

  // Health
  schoolsByHealth: { green: number; yellow: number; red: number; preOpening: number };
  totalBudgetVariance: number;

  // CapEx budget
  totalCapexBudget: number;
  totalCapexDelta: number;
  totalCapexDeltaPct: number;

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
  const totalVariableFacilities = schools.reduce(
    (sum, s) => sum + s.costs.variableFacilities.total,
    0
  );
  const totalStudentServices = schools.reduce((sum, s) => sum + s.costs.studentServices.total, 0);
  const totalAnnualDepreciation = schools.reduce(
    (sum, s) => sum + s.costs.annualDepreciation.total,
    0
  );
  const totalCapexBuildout = schools.reduce((sum, s) => sum + s.costs.capexBuildout, 0);

  const grandTotal =
    totalLease +
    totalFixedFacilities +
    totalVariableFacilities +
    totalStudentServices +
    totalAnnualDepreciation;
  const totalExcludingLease = grandTotal - totalLease;

  // Subcategory totals
  const totalSecurity = schools.reduce((sum, s) => sum + s.costs.fixedFacilities.security, 0);
  const totalIT = schools.reduce((sum, s) => sum + s.costs.fixedFacilities.itMaintenance, 0);
  const totalLandscaping = schools.reduce((sum, s) => sum + s.costs.fixedFacilities.landscaping, 0);
  const totalJanitorial = schools.reduce((sum, s) => sum + s.costs.variableFacilities.janitorial, 0);
  const totalUtilities = schools.reduce((sum, s) => sum + s.costs.variableFacilities.utilities, 0);
  const totalRepairs = schools.reduce((sum, s) => sum + s.costs.variableFacilities.repairs, 0);
  const totalFood = schools.reduce((sum, s) => sum + s.costs.studentServices.foodServices, 0);
  const totalTransport = schools.reduce(
    (sum, s) => sum + s.costs.studentServices.transportation,
    0
  );

  const effectiveEnrollment = Math.max(totalEnrollment, 1);

  // Space / per-sqft averages
  const totalSqft = schools.reduce((sum, s) => sum + s.sqft, 0);
  const totalNetFacFees = grandTotal - totalAnnualDepreciation;
  const safeSqft = Math.max(totalSqft, 1);
  const avgLeasePerSqft = totalLease / safeSqft;
  const avgFixedFacPerSqft = totalFixedFacilities / safeSqft;
  const avgVariableFacPerSqft = totalVariableFacilities / safeSqft;
  const avgStudentSvcPerSqft = totalStudentServices / safeSqft;
  const avgDepreciationPerSqft = totalAnnualDepreciation / safeSqft;
  const avgTotalCostPerSqft = grandTotal / safeSqft;
  const avgNetFacFeePerSqft = totalNetFacFees / safeSqft;

  // Revenue context
  const totalRevenueCurrent = schools.reduce((sum, s) => sum + s.revenue.current, 0);
  const totalRevenueAtCapacity = schools.reduce((sum, s) => sum + s.revenue.atCapacity, 0);
  const totalRevenueGap = totalRevenueAtCapacity - totalRevenueCurrent;
  const facilitiesPctOfRevenue = totalRevenueCurrent > 0
    ? (grandTotal / totalRevenueCurrent) * 100
    : 0;

  // Controllability
  const totalSunkCosts = schools.reduce((sum, s) => sum + s.sunkCosts, 0);
  const totalControllableCosts = schools.reduce((sum, s) => sum + s.controllableCosts, 0);
  const operatingSchools = schools.filter(s => s.isOperating);
  const avgMarginalCost = operatingSchools.length > 0
    ? operatingSchools.reduce((sum, s) => sum + s.marginalCostPerStudent, 0) / operatingSchools.length
    : 0;

  // Health counts
  const schoolsByHealth = {
    green: schools.filter(s => s.healthScore === 'green').length,
    yellow: schools.filter(s => s.healthScore === 'yellow').length,
    red: schools.filter(s => s.healthScore === 'red').length,
    preOpening: schools.filter(s => s.healthScore === 'gray').length,
  };

  // Budget variance
  const totalBudgetVariance = schools.reduce((sum, s) => sum + s.budget.totalVariance, 0);

  // CapEx budget
  const totalCapexBudget = schools.reduce((sum, s) => sum + s.budget.capexBudget, 0);
  const totalCapexDelta = totalCapexBuildout - totalCapexBudget;
  const totalCapexDeltaPct = totalCapexBudget > 0
    ? (totalCapexDelta / totalCapexBudget) * 100
    : 0;

  return {
    totalSchools: schools.length,
    totalEnrollment,
    totalCapacity,
    avgUtilization: totalCapacity > 0 ? (totalEnrollment / totalCapacity) * 100 : 0,

    totalLease,
    totalFixedFacilities,
    totalVariableFacilities,
    totalStudentServices,
    totalAnnualDepreciation,
    totalCapexBuildout,
    grandTotal,
    totalExcludingLease,
    totalDepreciatedCapex: totalAnnualDepreciation,

    avgCostPerStudent: grandTotal / effectiveEnrollment,
    avgExclLeasePerStudent: totalExcludingLease / effectiveEnrollment,

    totalSqft,
    totalNetFacFees,
    avgLeasePerSqft,
    avgFixedFacPerSqft,
    avgVariableFacPerSqft,
    avgStudentSvcPerSqft,
    avgDepreciationPerSqft,
    avgTotalCostPerSqft,
    avgNetFacFeePerSqft,

    totalRevenueCurrent,
    totalRevenueAtCapacity,
    totalRevenueGap,
    facilitiesPctOfRevenue,
    totalSunkCosts,
    totalControllableCosts,
    avgMarginalCost,
    schoolsByHealth,
    totalBudgetVariance,
    totalCapexBudget,
    totalCapexDelta,
    totalCapexDeltaPct,

    categoryBreakdown: [
      {
        category: 'Lease',
        amount: totalLease,
        pctOfTotal: grandTotal > 0 ? (totalLease / grandTotal) * 100 : 0,
        color: categoryColors.lease,
        subcategories: [{ name: 'Rent', amount: totalLease }],
      },
      {
        category: 'Fixed Facilities',
        amount: totalFixedFacilities,
        pctOfTotal: grandTotal > 0 ? (totalFixedFacilities / grandTotal) * 100 : 0,
        color: categoryColors.fixedFacilities,
        subcategories: [
          { name: 'Security', amount: totalSecurity },
          { name: 'IT Maintenance', amount: totalIT },
          { name: 'Landscaping', amount: totalLandscaping },
        ],
      },
      {
        category: 'Variable Facilities',
        amount: totalVariableFacilities,
        pctOfTotal: grandTotal > 0 ? (totalVariableFacilities / grandTotal) * 100 : 0,
        color: categoryColors.variableFacilities,
        subcategories: [
          { name: 'Repairs/Maintenance', amount: totalRepairs },
          { name: 'Utilities', amount: totalUtilities },
          { name: 'Janitorial', amount: totalJanitorial },
        ],
      },
      {
        category: 'Student Services',
        amount: totalStudentServices,
        pctOfTotal: grandTotal > 0 ? (totalStudentServices / grandTotal) * 100 : 0,
        color: categoryColors.studentServices,
        subcategories: [
          { name: 'Food Services', amount: totalFood },
          { name: 'Transportation', amount: totalTransport },
        ],
      },
      {
        category: 'Annual Depreciation',
        amount: totalAnnualDepreciation,
        pctOfTotal: grandTotal > 0 ? (totalAnnualDepreciation / grandTotal) * 100 : 0,
        color: categoryColors.annualDepreciation,
        subcategories: [
          { name: 'CapEx Depreciation', amount: totalAnnualDepreciation },
        ],
      },
    ].sort((a, b) => b.amount - a.amount),
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
  const fixedPortion =
    summary.totalLease + summary.totalFixedFacilities + summary.totalAnnualDepreciation;
  const fixedPct = summary.grandTotal > 0 ? (fixedPortion / summary.grandTotal) * 100 : 0;

  return [
    {
      id: 'lease-commitment',
      category: 'fixed-cost-warning',
      title: 'Lease Commitment',
      description: `${summary.grandTotal > 0 ? ((summary.totalLease / summary.grandTotal) * 100).toFixed(0) : 0}% of facilities costs are locked into lease agreements. This is the cost you commit to on day 1.`,
      metric: summary.totalLease,
      unit: '$ annual lease',
    },
    {
      id: 'fixed-cost-burden',
      category: 'fixed-cost-warning',
      title: 'Total Fixed Cost Burden',
      description: `${fixedPct.toFixed(0)}% of facilities costs (Lease + Fixed Facilities + Depreciation) cannot scale down with enrollment.`,
      metric: fixedPortion,
      unit: '$ fixed costs',
    },
    {
      id: 'student-services',
      category: 'info',
      title: 'Student Services',
      description: `Food services and transportation add ${summary.grandTotal > 0 ? ((summary.totalStudentServices / summary.grandTotal) * 100).toFixed(0) : 0}% to total facilities burden. These scale with enrollment.`,
      metric: summary.totalStudentServices,
      unit: '$ student services',
    },
    {
      id: 'capex-exposure',
      category: 'fixed-cost-warning',
      title: 'Total CapEx Exposure',
      description: `${summary.totalCapexBuildout.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} in one-time buildout costs across the portfolio.`,
      metric: summary.totalCapexBuildout,
      unit: '$ total capex',
    },
    {
      id: 'capacity-opportunity',
      category: 'opportunity',
      title: 'Utilization Opportunity',
      description: `Portfolio is at ${summary.avgUtilization.toFixed(0)}% capacity. Reaching full capacity would spread fixed costs across ${summary.totalCapacity - summary.totalEnrollment} more students.`,
      metric: summary.avgUtilization,
      unit: '% utilization',
    },
  ];
}

// ============================================================================
// EXPENSE BEHAVIOR RULES (for display)
// ============================================================================

export type CostBehavior = 'fixed' | 'semi-variable' | 'variable';

export interface ExpenseRule {
  id: string;
  name: string;
  category: string;
  costType: CostBehavior;
  fixedPercent: number;
  variablePercent: number;
  description: string;
}

export function getExpenseRules(preset: ExpensePreset = 'dashboard'): ExpenseRule[] {
  const rules = expensePresets[preset];
  return [
    {
      id: 'rent',
      name: 'Rent',
      category: 'lease',
      costType: 'fixed',
      fixedPercent: 1.0,
      variablePercent: 0,
      description: 'Lease commitment - locked in on day 1',
    },
    {
      id: 'security',
      name: 'Security Services',
      category: 'fixed-facilities',
      costType: 'fixed',
      fixedPercent: rules.security.fixed,
      variablePercent: rules.security.variable,
      description: 'Base security required regardless of enrollment',
    },
    {
      id: 'it-maintenance',
      name: 'IT Maintenance / Internet',
      category: 'fixed-facilities',
      costType: 'fixed',
      fixedPercent: rules.itMaintenance.fixed,
      variablePercent: rules.itMaintenance.variable,
      description: 'Core infrastructure fixed; device costs scale slightly',
    },
    {
      id: 'landscaping',
      name: 'Landscaping',
      category: 'fixed-facilities',
      costType: 'fixed',
      fixedPercent: rules.landscaping.fixed,
      variablePercent: rules.landscaping.variable,
      description: 'Grounds maintenance driven by space, not students',
    },
    {
      id: 'janitorial',
      name: 'Janitorial / Toiletries',
      category: 'variable-facilities',
      costType: 'semi-variable',
      fixedPercent: rules.janitorial.fixed,
      variablePercent: rules.janitorial.variable,
      description: 'Base cleaning fixed; supplies scale with occupancy',
    },
    {
      id: 'utilities',
      name: 'Utilities',
      category: 'variable-facilities',
      costType: 'semi-variable',
      fixedPercent: rules.utilities.fixed,
      variablePercent: rules.utilities.variable,
      description: 'Base heating/cooling fixed; marginal usage scales',
    },
    {
      id: 'repairs',
      name: 'Repairs / Maintenance',
      category: 'variable-facilities',
      costType: 'semi-variable',
      fixedPercent: rules.repairs.fixed,
      variablePercent: rules.repairs.variable,
      description: 'Building maintenance mostly fixed; wear increases with usage',
    },
    {
      id: 'food-services',
      name: 'Food Services',
      category: 'student-services',
      costType: 'variable',
      fixedPercent: rules.foodServices.fixed,
      variablePercent: rules.foodServices.variable,
      description: 'Meal programs scale directly with student count',
    },
    {
      id: 'transportation',
      name: 'Transportation',
      category: 'student-services',
      costType: 'variable',
      fixedPercent: rules.transportation.fixed,
      variablePercent: rules.transportation.variable,
      description: 'Bus routes and transport services scale with students',
    },
    {
      id: 'depreciation',
      name: 'Depreciation / Amortization',
      category: 'annual-depreciation',
      costType: 'fixed',
      fixedPercent: 1.0,
      variablePercent: 0,
      description: 'Annualized capex depreciation - fully fixed sunk cost',
    },
  ];
}

// Legacy export for backward compatibility
export const expenseRules = getExpenseRules('dashboard');
