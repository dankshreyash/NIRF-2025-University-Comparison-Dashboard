export type Numeric = number | null;

export interface Institute {
  shortName: string;
  name: string;
  nirfId: string | null;
}

export interface FeeReimbursement {
  stateAndCentralGovernment: Numeric;
  institution: Numeric;
  privateBodies: Numeric;
  notReceivingFullTuitionFeeReimbursement: Numeric;
}

export interface StudentStrength {
  programType: string;
  male: Numeric;
  female: Numeric;
  total: Numeric;
  withinState: Numeric;
  outsideState: Numeric;
  outsideCountry: Numeric;
  economicallyBackward: Numeric;
  sociallyChallenged: Numeric;
  feeReimbursement: FeeReimbursement;
}

export interface PlacementRow {
  programType: string | null;
  intakeAcademicYear: string;
  intake: Numeric;
  admitted: Numeric;
  lateralEntryAcademicYear: string | null;
  lateralEntry: Numeric;
  graduationAcademicYear: string | null;
  graduatedMinimumTime: Numeric;
  placed: Numeric;
  medianSalaryInr: Numeric;
  higherStudies: Numeric;
}

export interface FacultyMember {
  srNo: number;
  name: string | null;
  age: Numeric;
  designation: string | null;
  designationGroup: string;
  gender: string | null;
  qualification: string | null;
  qualificationGroup: string;
  experienceMonths: Numeric;
  currentlyWorking: boolean | null;
  joiningDate: string | null;
  leavingDate: string | null;
  associationType: string | null;
}

export interface FinanceYear {
  academicYear: string;
  capex: {
    library: Numeric;
    labEquipment: Numeric;
    workshops: Numeric;
    studios: Numeric;
    other: Numeric;
  };
  opex: {
    salaries: Numeric;
    maintenance: Numeric;
    seminars: Numeric;
  };
}

export interface AnnualMetric {
  financialYear: string;
  projects?: Numeric;
  fundingAgencies?: Numeric;
  clients?: Numeric;
  amountInr?: Numeric;
  programs?: Numeric;
  participants?: Numeric;
  earningsInr?: Numeric;
}

export interface UniversityData {
  schemaVersion: number;
  sourceFile: string;
  institute: Institute;
  sanctionedIntake: Array<{
    programType: string;
    byAcademicYear: Record<string, Numeric>;
  }>;
  studentStrength: StudentStrength[];
  placements: PlacementRow[];
  phd: {
    pursuing: {
      fullTime: Numeric;
      partTime: Numeric;
    };
    graduated: Array<{
      academicYear: string;
      fullTime: Numeric;
      partTime: Numeric;
    }>;
  };
  finance: {
    years: FinanceYear[];
  };
  ipR: Array<{
    calendarYear: string;
    published: Numeric;
    granted: Numeric;
  }>;
  sponsoredResearch: AnnualMetric[];
  consultancy: AnnualMetric[];
  executiveDevelopment: AnnualMetric[];
  accessibility: {
    liftsRamps: string | null;
    walkingAids: string | null;
    accessibleToilets: string | null;
  };
  naac: {
    valid: boolean | null;
    validFrom: string | null;
    validUpto: string | null;
    cgpa: Numeric;
  };
  policies: Record<string, boolean | null>;
  sustainability: Array<{
    practice: string;
    selectedOptions: string[];
  }>;
  faculty: {
    reportedCount: Numeric;
    rows: FacultyMember[];
  };
  dataWarnings: string[];
}

export interface CombinedData {
  schemaVersion: number;
  source: string;
  universities: UniversityData[];
}
