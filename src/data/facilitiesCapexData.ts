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

export interface SchoolData {
  id: string;
  name: string;
  displayName: string;
  companyId: string;

  schoolType: SchoolType;
  tuitionTier: TuitionTier;

  currentEnrollment: number;
  capacity: number;
  utilizationRate: number;
  tuition: number;

  sqft: number;
  sqftPerStudent: number;

  costs: SixCategoryCosts;

  metrics: {
    costPerStudentCurrent: number;
    costPerStudentCapacity: number;
    pctOfTuitionCurrent: number;
    pctOfTuitionCapacity: number;
    totalExclLeasePerStudent: number;
    costPerSqft: number;
    leasePerSqft: number;
  };

  breakeven: {
    studentsFor15Pct: number;
    studentsFor20Pct: number;
    pctAt75Capacity: number;
    pctAt100Capacity: number;
  };

  budget: {
    modelCostPerStudent: number;
    actualCostPerStudent: number;
    delta: number;
    deltaPct: number;
  };
}

// ============================================================================
// SCHOOL TYPES & TUITION TIERS
// ============================================================================

export type SchoolType = 'alpha-school' | 'microschool' | 'gt-school' | 'low-dollar' | 'montessorium';
export type TuitionTier = 'premium' | 'standard' | 'value' | 'economy';

export const schoolTypeLabels: Record<SchoolType, string> = {
  'alpha-school': 'Alpha School',
  microschool: 'MicroSchool',
  'gt-school': 'GT / eSports',
  'low-dollar': 'Low Dollar School',
  montessorium: 'Montessorium',
};

export const tuitionTierLabels: Record<TuitionTier, string> = {
  premium: '$50K+',
  standard: '$35K-$40K',
  value: '$20K-$25K',
  economy: '<$20K',
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
  // Budget comparison
  modelTotalCostPerStudent: number;
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
    modelTotalCostPerStudent: 19485,
    delta: 8337,
  },
  alpha_ny: {
    displayName: 'Alpha New York',
    currentEnrollment: 33,
    capacity: 123,
    schoolType: 'microschool',
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
    modelTotalCostPerStudent: 17112,
    delta: 394,
  },
  gt_school: {
    displayName: 'GT School',
    currentEnrollment: 21,
    capacity: 180,
    schoolType: 'gt-school',
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
    modelTotalCostPerStudent: 10718,
    delta: 5558,
  },
  alpha_sf: {
    displayName: 'Alpha San Francisco',
    currentEnrollment: 19,
    capacity: 68,
    schoolType: 'microschool',
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
    modelTotalCostPerStudent: 13320,
    delta: 16829,
  },
  esports_austin: {
    displayName: 'eSports Academy Austin',
    currentEnrollment: 15,
    capacity: 80,
    schoolType: 'gt-school',
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
    modelTotalCostPerStudent: 3450,
    delta: 13492,
  },
  alpha_piedmont: {
    displayName: 'Alpha Piedmont',
    currentEnrollment: 0,
    capacity: 106,
    schoolType: 'microschool',
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
    modelTotalCostPerStudent: 3281,
    delta: 2790,
  },
  alpha_santa_barbara: {
    displayName: 'Alpha Santa Barbara',
    currentEnrollment: 13,
    capacity: 78,
    schoolType: 'microschool',
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
    modelTotalCostPerStudent: 13590,
    delta: 9484,
  },
  alpha_palo_alto: {
    displayName: 'Alpha Palo Alto',
    currentEnrollment: 0,
    capacity: 47,
    schoolType: 'microschool',
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
    modelTotalCostPerStudent: 5250,
    delta: 15350,
  },
  alpha_scottsdale: {
    displayName: 'Alpha Scottsdale',
    currentEnrollment: 33,
    capacity: 38,
    schoolType: 'microschool',
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
    modelTotalCostPerStudent: 10138,
    delta: 10355,
  },
  alpha_charlotte: {
    displayName: 'Alpha Charlotte',
    currentEnrollment: 0,
    capacity: 40,
    schoolType: 'microschool',
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
    modelTotalCostPerStudent: 5243,
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
    modelTotalCostPerStudent: 5250,
    delta: 1460,
  },
  montessorium: {
    displayName: 'Montessorium Brushy Creek',
    currentEnrollment: 18,
    capacity: 25,
    schoolType: 'montessorium',
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
// BUILD SCHOOL DATA
// ============================================================================

export function buildSchoolData(): SchoolData[] {
  const schools: SchoolData[] = [];

  for (const [id, raw] of Object.entries(rawSchoolData)) {
    const costs = transformToSixCategories(raw);
    const enrollment = Math.max(raw.currentEnrollment, 1); // Avoid division by zero
    const utilizationRate = raw.currentEnrollment / raw.capacity;

    const tuitionRevenueCurrent = enrollment * raw.tuition;
    const tuitionRevenueCapacity = raw.capacity * raw.tuition;

    const studentsFor15Pct = Math.ceil(costs.grandTotal / (0.15 * raw.tuition));
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

    const actualCostPerStudent = costs.grandTotal / raw.capacity;
    const deltaPct = raw.modelTotalCostPerStudent > 0
      ? ((actualCostPerStudent - raw.modelTotalCostPerStudent) / raw.modelTotalCostPerStudent) * 100
      : 0;

    schools.push({
      id,
      name: id,
      displayName: raw.displayName,
      companyId: id,
      schoolType: raw.schoolType,
      tuitionTier: raw.tuitionTier,
      currentEnrollment: raw.currentEnrollment,
      capacity: raw.capacity,
      utilizationRate,
      tuition: raw.tuition,
      sqft: raw.sqft,
      sqftPerStudent,
      costs,
      metrics: {
        costPerStudentCurrent: costs.grandTotal / enrollment,
        costPerStudentCapacity: costs.grandTotal / raw.capacity,
        pctOfTuitionCurrent: (costs.grandTotal / tuitionRevenueCurrent) * 100,
        pctOfTuitionCapacity: tuitionRevenueCapacity > 0
          ? (costs.grandTotal / tuitionRevenueCapacity) * 100
          : 0,
        totalExclLeasePerStudent: costs.totalExcludingLease / enrollment,
        costPerSqft,
        leasePerSqft,
      },
      breakeven: {
        studentsFor15Pct,
        studentsFor20Pct,
        pctAt75Capacity,
        pctAt100Capacity,
      },
      budget: {
        modelCostPerStudent: raw.modelTotalCostPerStudent,
        actualCostPerStudent,
        delta: raw.delta,
        deltaPct,
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
    microschool: [],
    'gt-school': [],
    'low-dollar': [],
    montessorium: [],
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
