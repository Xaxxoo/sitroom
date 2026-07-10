export enum Role {
  ADMIN = 'admin',
  EXECUTIVE = 'executive',
  STATE_COORDINATOR = 'state_coordinator',
  LGA_COORDINATOR = 'lga_coordinator',
  WARD_COORDINATOR = 'ward_coordinator',
  AGENT = 'agent',
}

export enum ResultStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  FLAGGED = 'flagged',
  VERIFIED = 'verified',
}

export enum IncidentType {
  VIOLENCE = 'violence',
  BALLOT_SNATCHING = 'ballot_snatching',
  INTIMIDATION = 'intimidation',
  LATE_MATERIALS = 'late_materials',
  RESULT_FALSIFICATION = 'result_falsification',
  AGENT_HARASSMENT = 'agent_harassment',
  UNDERAGE_VOTING = 'underage_voting',
  VOTE_BUYING = 'vote_buying',
  OTHER = 'other',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  OPEN = 'open',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
}

export interface Lga {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
}

export interface Ward {
  id: string;
  name: string;
  lga: Lga;
}

export interface PollingUnit {
  id: string;
  name: string;
  code: string;
  registeredVoters: number;
  ward: Ward;
}

export interface Party {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
}

export interface PartyScore {
  id: string;
  party: Party;
  votes: number;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastSeenAt: string;
  pollingUnit?: PollingUnit;
  ward?: Ward;
  lga?: Lga;
}

export interface Result {
  id: string;
  pollingUnit: PollingUnit;
  status: ResultStatus;
  accreditedVoters: number;
  totalVotesCast: number;
  rejectedBallots: number;
  totalValidVotes: number;
  isAnomalous: boolean;
  anomalyReasons: string[];
  partyScores: PartyScore[];
  iNecFormImageUrl?: string;
  submittedBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  pollingUnit?: PollingUnit;
  ward?: Ward;
  lga?: Lga;
  reportedBy: User;
  resolvedBy?: User;
  resolutionNote?: string;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
}

// Matches actual backend response from results.service.ts getAggregation()
export interface PartySummaryItem {
  partyId: string;
  name: string;
  abbreviation: string;
  color: string;
  totalVotes: number;
}

export interface Aggregation {
  puReporting: number;
  anomalousCount: number;
  totalAccredited: number;
  totalVotesCast: number;
  totalRejected: number;
  totalValidVotes: number;
  leadingParty: PartySummaryItem | null;
  partySummary: PartySummaryItem[];
}

// Matches actual backend response from results.service.ts getLgaAggregation()
export interface LgaAggregation {
  lgaId: string;
  lgaName: string;
  puReporting: number;
  partyTotals: Record<string, number>; // abbreviation -> total votes
}

// Matches actual backend response from incidents.service.ts getStats()
export interface IncidentStats {
  total: number;
  open: number;
  escalated: number;
  resolved: number;
  critical: number;
}

// Matches actual backend response from admin.service.ts getDashboardStats()
export interface AdminStats {
  geography: {
    lgas: number;
    wards: number;
    pollingUnits: number;
  };
}

export interface GeoStats {
  lgas: number;
  wards: number;
  pollingUnits: number;
}
